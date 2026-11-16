package com.reclaim.blocking

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.graphics.PixelFormat
import android.graphics.Rect
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.Toast
import com.reclaim.R
import com.reclaim.accessibility.ReclaimAccessibilityService
import com.reclaim.bridge.ReclaimNativeModule

class ShortsOverlayBlocker(private val service: AccessibilityService) {

    private val windowManager = service.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val audioManager = service.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var isShowing = false

    private var overlayView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var currentOverlayHeight = 0

    // Cached node or fallback coordinates to click Home
    private var cachedHomeButton: AccessibilityNodeInfo? = null

    companion object {
        private const val TAG = "ReclaimOverlay"
        private const val YOUTUBE_BOTTOM_BAR_ID = "com.google.android.youtube:id/bottom_bar_container"
    }

    fun isShowing(): Boolean = isShowing

    /**
     * Show or adjust the overlay to exactly cover the Shorts video area
     * while leaving YouTube's bottom navigation bar and system status bar visible and interactive.
     */
    fun showOrUpdate(rootNode: AccessibilityNodeInfo) {
        val displayMetrics = service.resources.displayMetrics
        val statusBarHeight = getStatusBarHeight()
        val (bottomBarTop, homeNode) = findBottomBarTop(rootNode, displayMetrics)

        if (homeNode != null) {
            cachedHomeButton = homeNode
        }

        val targetHeight = maxOf(100, bottomBarTop - statusBarHeight)

        mainHandler.post {
            if (isShowing && overlayView != null && layoutParams != null) {
                // If height changed (e.g. YouTube bottom bar animated or rendered), update layout
                if (Math.abs(currentOverlayHeight - targetHeight) > 10) {
                    currentOverlayHeight = targetHeight
                    layoutParams?.height = targetHeight
                    try {
                        windowManager.updateViewLayout(overlayView, layoutParams)
                        Log.d(TAG, "Updated overlay height to $targetHeight")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to update overlay layout: ${e.message}")
                    }
                }
                return@post
            }

            // Create and attach overlay
            createAndAttachOverlay(statusBarHeight, targetHeight)
        }
    }

    private fun createAndAttachOverlay(statusBarHeight: Int, targetHeight: Int) {
        if (isShowing) return

        try {
            val inflater = LayoutInflater.from(service)
            val view = inflater.inflate(R.layout.overlay_shorts_blocking, null)

            val windowType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
            } else {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            }

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                targetHeight,
                windowType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 0
                y = statusBarHeight
            }

            // Button: Return to Productive Viewing
            val returnButton = view.findViewById<Button>(R.id.btn_return_productive)
            returnButton?.setOnClickListener {
                handleReturnToProductive()
            }

            // Button: 5-minute Breather
            val breatherButton = view.findViewById<Button>(R.id.btn_take_breather)
            breatherButton?.setOnClickListener {
                BlockingManager.grantTemporaryPass(5)
                hide()
                Toast.makeText(service, "5-minute breather granted", Toast.LENGTH_SHORT).show()
            }

            windowManager.addView(view, params)
            overlayView = view
            layoutParams = params
            currentOverlayHeight = targetHeight
            isShowing = true
            Log.d(TAG, "Attached Shorts blocking overlay: height=$targetHeight, y=$statusBarHeight, type=$windowType")

            // Pause YouTube video/audio so it doesn't play in background under overlay
            pauseYouTubeAudio()

            // Record block statistic in React Native
            ReclaimNativeModule.notifyShortsBlocked()

        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach TYPE_ACCESSIBILITY_OVERLAY: ${e.message}")
            if (layoutParams?.type != WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY) {
                tryFallbackApplicationOverlay(statusBarHeight, targetHeight)
            }
        }
    }

    private fun tryFallbackApplicationOverlay(statusBarHeight: Int, targetHeight: Int) {
        try {
            val inflater = LayoutInflater.from(service)
            val view = inflater.inflate(R.layout.overlay_shorts_blocking, null)

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                targetHeight,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 0
                y = statusBarHeight
            }

            view.findViewById<Button>(R.id.btn_return_productive)?.setOnClickListener {
                handleReturnToProductive()
            }

            view.findViewById<Button>(R.id.btn_take_breather)?.setOnClickListener {
                BlockingManager.grantTemporaryPass(5)
                hide()
            }

            windowManager.addView(view, params)
            overlayView = view
            layoutParams = params
            currentOverlayHeight = targetHeight
            isShowing = true
            Log.d(TAG, "Attached fallback TYPE_APPLICATION_OVERLAY: height=$targetHeight, y=$statusBarHeight")
            pauseYouTubeAudio()
            ReclaimNativeModule.notifyShortsBlocked()
        } catch (e: Exception) {
            Log.e(TAG, "Failed fallback TYPE_APPLICATION_OVERLAY: ${e.message}")
        }
    }

    private fun pauseYouTubeAudio() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    .setOnAudioFocusChangeListener { /* no-op */ }
                    .build()
                audioFocusRequest = request
                audioManager?.requestAudioFocus(request)
            } else {
                @Suppress("DEPRECATION")
                audioManager?.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to pause audio: ${e.message}")
        }
    }

    private fun restoreYouTubeAudio() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let {
                    audioManager?.abandonAudioFocusRequest(it)
                    audioFocusRequest = null
                }
            } else {
                @Suppress("DEPRECATION")
                audioManager?.abandonAudioFocus(null)
            }
        } catch (_: Exception) {}
    }

    /**
     * Navigates the user to YouTube Home:
     * 1. First tries to click YouTube's native 'Home' bottom navigation item.
     * 2. If node click fails, executes navigateBackToNormalYouTube.
     */
    private fun handleReturnToProductive() {
        // Start a short 2.5s transition grace period so overlay doesn't re-trigger while animating to Home
        BlockingManager.startTransitionGrace(2500L)

        // Attempt 1: Click the Home button node directly
        var clicked = false
        try {
            if (cachedHomeButton != null) {
                clicked = cachedHomeButton?.performAction(AccessibilityNodeInfo.ACTION_CLICK) ?: false
            }

            if (!clicked) {
                // Search fresh active window for Home tab
                val root = service.rootInActiveWindow
                if (root != null) {
                    val (_, homeNode) = findBottomBarTop(root, service.resources.displayMetrics)
                    if (homeNode != null) {
                        clicked = homeNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    }
                }
            }
        } catch (_: Exception) {}

        // Attempt 2: Use service helper which executes back action and clicks Home
        if (!clicked) {
            (service as? ReclaimAccessibilityService)?.navigateBackToNormalYouTube()
        }

        hide()
    }

    /**
     * Remove the overlay cleanly when user leaves Shorts.
     */
    fun hide() {
        mainHandler.post {
            if (isShowing && overlayView != null) {
                restoreYouTubeAudio()
                try {
                    windowManager.removeView(overlayView)
                } catch (_: Exception) {}
                overlayView = null
                layoutParams = null
                isShowing = false
                cachedHomeButton = null
            }
        }
    }

    private fun getStatusBarHeight(): Int {
        var statusBarHeight = 0
        val resourceId = service.resources.getIdentifier("status_bar_height", "dimen", "android")
        if (resourceId > 0) {
            statusBarHeight = service.resources.getDimensionPixelSize(resourceId)
        }
        val fallback = (28 * service.resources.displayMetrics.density).toInt()
        return if (statusBarHeight > 0) statusBarHeight else fallback
    }

    /**
     * Finds the exact top Y-coordinate of YouTube's bottom navigation bar
     * and the Home button node for direct navigation.
     */
    private fun findBottomBarTop(
        rootNode: AccessibilityNodeInfo,
        displayMetrics: DisplayMetrics
    ): Pair<Int, AccessibilityNodeInfo?> {
        val screenHeight = displayMetrics.heightPixels
        val thresholdY = (screenHeight * 0.70f).toInt()

        // 1. Try finding by YouTube's specific bottom_bar_container resource ID
        val bottomBars = rootNode.findAccessibilityNodeInfosByViewId(YOUTUBE_BOTTOM_BAR_ID)
        if (bottomBars.isNotEmpty()) {
            val barNode = bottomBars[0]
            val rect = Rect()
            barNode.getBoundsInScreen(rect)
            if (rect.top in thresholdY..screenHeight) {
                val homeNode = findHomeButtonInNode(barNode)
                return Pair(rect.top, homeNode)
            }
        }

        // 2. BFS search for Home / Shorts / Subscriptions tab near the bottom
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(rootNode)
        var foundTop = 0
        var homeButtonNode: AccessibilityNodeInfo? = null

        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()
            val desc = node.contentDescription?.toString() ?: ""

            if (desc.equals("Home", ignoreCase = true)) {
                val rect = Rect()
                node.getBoundsInScreen(rect)
                if (rect.top in thresholdY..screenHeight) {
                    foundTop = rect.top
                    homeButtonNode = node
                    break
                }
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    queue.add(child)
                }
            }
        }

        if (foundTop > 0) {
            return Pair(foundTop, homeButtonNode)
        }

        // 3. Fallback calculation: screenHeight minus standard bottom bar height (56dp + navigation insets)
        val fallbackBottomBarHeight = (64 * displayMetrics.density).toInt()
        return Pair(screenHeight - fallbackBottomBarHeight, null)
    }

    private fun findHomeButtonInNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(node)
        while (queue.isNotEmpty()) {
            val cur = queue.removeFirst()
            val desc = cur.contentDescription?.toString() ?: ""
            if (desc.equals("Home", ignoreCase = true)) {
                return cur
            }
            for (i in 0 until cur.childCount) {
                val child = cur.getChild(i)
                if (child != null) queue.add(child)
            }
        }
        return null
    }
}
