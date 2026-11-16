package com.reclaim.accessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.reclaim.blocking.BlockingManager
import com.reclaim.blocking.ShortsOverlayBlocker
import com.reclaim.bridge.ReclaimNativeModule
import com.reclaim.detection.ScreenState
import com.reclaim.detection.ShortsDetectionEngine
import com.reclaim.island.DynamicIslandManager
import com.reclaim.schedule.ScheduleManager
import com.reclaim.schedule.ScheduleRestrictions
import com.reclaim.session.FocusSessionManager
import com.reclaim.stats.UsageStatsHelper
import org.json.JSONArray
import org.json.JSONObject

class ReclaimAccessibilityService : AccessibilityService() {

    companion object {
        const val PREFS_NAME = "reclaim_prefs"
        const val KEY_SHORTS_BLOCKED = "youtube_shorts_blocked"
        const val KEY_REELS_BLOCKED = "instagram_reels_blocked"
        const val KEY_SPOTLIGHT_BLOCKED = "snapchat_spotlight_blocked"
        const val KEY_DYNAMIC_ISLAND = "dynamic_island_enabled"
        const val KEY_APP_LIMITS = "reclaim_app_limits_json"
        const val KEY_BLOCKED_WEBSITES = "reclaim_blocked_websites_json"
        const val KEY_BLOCK_UNINSTALL = "reclaim_block_uninstall"
        const val KEY_BLOCK_SPLIT_SCREEN = "reclaim_block_split_screen"
        const val KEY_BLOCK_FLOATING_WINDOW = "reclaim_block_floating_window"

        const val KEY_YOUTUBE_COMPLETELY_BLOCKED = "youtube_completely_blocked"
        const val KEY_YOUTUBE_HOMEPAGE_BLOCKED = "youtube_homepage_blocked"
        const val KEY_INSTAGRAM_COMPLETELY_BLOCKED = "instagram_completely_blocked"
        const val KEY_BLOCKED_PACKAGES = "reclaim_blocked_packages_json"
        const val KEY_BLOCK_ADULT_CONTENT = "reclaim_block_adult_content"
        const val KEY_STUDY_MODE = "reclaim_study_mode"

        private const val YOUTUBE_PACKAGE = "com.google.android.youtube"
        private const val INSTAGRAM_PACKAGE = "com.instagram.android"
        private const val SNAPCHAT_PACKAGE = "com.snapchat.android"
        private const val SETTINGS_PACKAGE = "com.android.settings"

        private val BROWSER_PACKAGES = setOf(
            "com.android.chrome",
            "com.chrome.beta",
            "com.google.android.browser",
            "org.mozilla.firefox",
            "com.microsoft.emmx",
            "com.opera.browser",
            "com.brave.browser"
        )

        private const val DEBOUNCE_INTERVAL_MS = 150L

        @Volatile
        var instance: ReclaimAccessibilityService? = null
            private set
    }

    data class AppLimitRule(
        val packageName: String,
        val appName: String,
        val limitMinutes: Int,
        val enabled: Boolean
    )

    private val detectionEngine = ShortsDetectionEngine()
    private lateinit var dynamicIslandManager: DynamicIslandManager
    private lateinit var usageStatsHelper: UsageStatsHelper
    private lateinit var shortsOverlayBlocker: ShortsOverlayBlocker
    private val mainHandler = Handler(Looper.getMainLooper())

    private var lastInspectionTimestamp = 0L
    private var unblockedShortsScrolledCount = 0
    private var unblockedReelsScrolledCount = 0
    private var lastObservedShortId: String? = null
    private var lastScrollTimestamp = 0L
    private var lastInstagramScrollTimestamp = 0L

    var isYouTubeCompletelyBlocked = false
    var isYouTubeHomepageBlocked = false
    var isYouTubeShortsBlocked = true
    var isInstagramCompletelyBlocked = false
    var isInstagramReelsBlocked = true
    var isSnapchatSpotlightBlocked = true
    var isDynamicIslandEnabled = true
    var isBlockAdultContentEnabled = false
    var isStudyModeEnabled = false

    var isBlockUninstallEnabled = false
    var isBlockSplitScreenEnabled = false
    var isBlockFloatingWindowEnabled = false

    val blockedPackages = mutableSetOf<String>()
    val appLimits = mutableListOf<AppLimitRule>()
    val blockedWebsites = mutableListOf<String>()

    private val reblockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == DynamicIslandManager.ACTION_REBLOCK) {
                // User tapped "Re-block Now" on the Dynamic Island alert
                BlockingManager.revokeTemporaryPass()
                isYouTubeShortsBlocked = true
                isInstagramReelsBlocked = true

                // Persist new setting
                val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit()
                    .putBoolean(KEY_SHORTS_BLOCKED, true)
                    .putBoolean(KEY_REELS_BLOCKED, true)
                    .apply()

                // Hide Dynamic Island
                dynamicIslandManager.hideIsland()

                // Notify React Native UI
                ReclaimNativeModule.notifyBlockingConfigChanged(true)

                // If currently on Shorts, step back immediately
                val root = rootInActiveWindow
                if (root != null) {
                    val result = detectionEngine.inspectNodeHierarchy(root)
                    if (result.isShorts) {
                        shortsOverlayBlocker.showOrUpdate(root)
                    }
                    root.recycle()
                }
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        dynamicIslandManager = DynamicIslandManager(this)
        usageStatsHelper = UsageStatsHelper(this)
        shortsOverlayBlocker = ShortsOverlayBlocker(this)

        loadPersistedConfig()

        // Register internal receiver for Dynamic Island "Re-block" action
        val filter = IntentFilter(DynamicIslandManager.ACTION_REBLOCK)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(reblockReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(reblockReceiver, filter)
        }

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_SCROLLED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 50
        }
        serviceInfo = info

        ReclaimNativeModule.notifyPermissionChanged()
    }

    fun loadPersistedConfig() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        isYouTubeCompletelyBlocked = prefs.getBoolean(KEY_YOUTUBE_COMPLETELY_BLOCKED, false)
        isYouTubeHomepageBlocked = prefs.getBoolean(KEY_YOUTUBE_HOMEPAGE_BLOCKED, false)
        isYouTubeShortsBlocked = prefs.getBoolean(KEY_SHORTS_BLOCKED, true)
        isInstagramCompletelyBlocked = prefs.getBoolean(KEY_INSTAGRAM_COMPLETELY_BLOCKED, false)
        isInstagramReelsBlocked = prefs.getBoolean(KEY_REELS_BLOCKED, true)
        isSnapchatSpotlightBlocked = prefs.getBoolean(KEY_SPOTLIGHT_BLOCKED, true)
        isDynamicIslandEnabled = prefs.getBoolean(KEY_DYNAMIC_ISLAND, true)
        isBlockAdultContentEnabled = prefs.getBoolean(KEY_BLOCK_ADULT_CONTENT, false)
        isStudyModeEnabled = prefs.getBoolean(KEY_STUDY_MODE, false)

        isBlockUninstallEnabled = prefs.getBoolean(KEY_BLOCK_UNINSTALL, false)
        isBlockSplitScreenEnabled = prefs.getBoolean(KEY_BLOCK_SPLIT_SCREEN, false)
        isBlockFloatingWindowEnabled = prefs.getBoolean(KEY_BLOCK_FLOATING_WINDOW, false)

        // Load completely blocked packages list
        blockedPackages.clear()
        val pkgsJson = prefs.getString(KEY_BLOCKED_PACKAGES, "[]") ?: "[]"
        try {
            val arr = JSONArray(pkgsJson)
            for (i in 0 until arr.length()) {
                blockedPackages.add(arr.getString(i))
            }
        } catch (_: Exception) {}

        // Load app limits
        appLimits.clear()
        val limitsJson = prefs.getString(KEY_APP_LIMITS, "[]") ?: "[]"
        try {
            val arr = JSONArray(limitsJson)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                appLimits.add(
                    AppLimitRule(
                        packageName = obj.getString("packageName"),
                        appName = obj.optString("appName", obj.getString("packageName")),
                        limitMinutes = obj.getInt("limitMinutes"),
                        enabled = obj.optBoolean("enabled", true)
                    )
                )
            }
        } catch (_: Exception) {}

        // Load blocked websites
        blockedWebsites.clear()
        val sitesJson = prefs.getString(KEY_BLOCKED_WEBSITES, "[]") ?: "[]"
        try {
            val arr = JSONArray(sitesJson)
            for (i in 0 until arr.length()) {
                blockedWebsites.add(arr.getString(i).lowercase())
            }
        } catch (_: Exception) {}
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName == this.packageName) return // Do not inspect own windows

        // Dismiss Shorts overlay only on genuine user navigation to a different application
        val isSystemWindow = packageName == "com.android.systemui" ||
                packageName == "android" ||
                packageName.contains("inputmethod") ||
                packageName == this.packageName

        if (!isSystemWindow && packageName != YOUTUBE_PACKAGE && ::shortsOverlayBlocker.isInitialized) {
            shortsOverlayBlocker.hide()
        }

        val now = SystemClock.uptimeMillis()
        if (now - lastInspectionTimestamp < DEBOUNCE_INTERVAL_MS) {
            return
        }
        lastInspectionTimestamp = now

        val rootNode = rootInActiveWindow ?: return

        // Check Multi-Window / Split-Screen / Floating Window restrictions
        if (isBlockSplitScreenEnabled || isBlockFloatingWindowEnabled) {
            if (checkWindowModeViolations(rootNode, packageName)) {
                rootNode.recycle()
                return
            }
        }

        // 1. COMPLETE APPLICATION RESTRICTION (Takes Top Priority)
        val isExplicitlyBlocked = blockedPackages.contains(packageName)
        val isInstagramBlocked = (packageName == INSTAGRAM_PACKAGE) && isInstagramCompletelyBlocked
        val isYouTubeBlocked = (packageName == YOUTUBE_PACKAGE) && isYouTubeCompletelyBlocked

        if ((isExplicitlyBlocked || isInstagramBlocked || isYouTubeBlocked) && !BlockingManager.isPassActive()) {
            val appName = getAppName(packageName)
            BlockingManager.showBlockingScreen(
                this,
                "APP_BLOCKED",
                appName,
                "$appName is completely blocked to protect your focus and time.",
                packageName
            )
            rootNode.recycle()
            return
        }

        // 2. FOCUS SESSION RESTRICTION
        if (FocusSessionManager.instance?.isSessionActive() == true && !BlockingManager.isPassActive()) {
            val session = FocusSessionManager.instance!!
            val isBlockedInSession = session.isPackageBlocked(packageName) ||
                    (packageName == YOUTUBE_PACKAGE && session.isYouTubeCompletelyBlocked()) ||
                    (packageName == INSTAGRAM_PACKAGE && session.isPackageBlocked(INSTAGRAM_PACKAGE))

            if (isBlockedInSession) {
                val appName = getAppName(packageName)
                BlockingManager.showBlockingScreen(
                    this,
                    "FOCUS_SESSION",
                    appName,
                    "$appName is blocked during your active focus session (${session.getTag()}).",
                    packageName
                )
                rootNode.recycle()
                return
            }
        }

        // 3. SCHEDULE RESTRICTION
        val scheduleRestrictions = ScheduleManager.instance?.getActiveRestrictions()
        if (scheduleRestrictions != null && !BlockingManager.isPassActive()) {
            val isBlockedInSchedule = scheduleRestrictions.blockedPackages.contains(packageName) ||
                    (packageName == YOUTUBE_PACKAGE && scheduleRestrictions.blockYouTubeCompletely)

            if (isBlockedInSchedule) {
                val appName = getAppName(packageName)
                val scheduleNames = scheduleRestrictions.activeScheduleTitles.joinToString(", ")
                BlockingManager.showBlockingScreen(
                    this,
                    "SCHEDULE",
                    appName,
                    "$appName is blocked during your active schedule: $scheduleNames.",
                    packageName
                )
                rootNode.recycle()
                return
            }
        }

        // 4. DAILY APP LIMITS ENFORCEMENT
        val appLimitRule = appLimits.find { it.packageName == packageName && it.enabled }
        if (appLimitRule != null && !BlockingManager.isPassActive()) {
            val usageMinutes = usageStatsHelper.queryPackageTodayUsageMinutes(packageName)
            if (usageMinutes >= appLimitRule.limitMinutes) {
                BlockingManager.showBlockingScreen(
                    this,
                    "APP_LIMIT",
                    appLimitRule.appName,
                    "You have reached your daily limit of ${formatMinutes(appLimitRule.limitMinutes)} on ${appLimitRule.appName} (used: ${formatMinutes(usageMinutes)} today).",
                    packageName
                )
                rootNode.recycle()
                return
            }
        }

        // 5. YOUTUBE CONTENT-SPECIFIC RESTRICTIONS (Homepage & Shorts)
        if (packageName == YOUTUBE_PACKAGE) {
            handleYouTubeEvent(event, rootNode, now, scheduleRestrictions)
            rootNode.recycle()
            return
        }

        // 5.5 INSTAGRAM REELS RESTRICTION & DYNAMIC ISLAND COUNTER
        if (packageName == INSTAGRAM_PACKAGE) {
            handleInstagramEvent(event, rootNode, now)
            rootNode.recycle()
            return
        }

        // 6. SNAPCHAT SPOTLIGHT INSPECTION
        if (packageName == SNAPCHAT_PACKAGE && isSnapchatSpotlightBlocked) {
            handleSnapchatEvent(rootNode)
            rootNode.recycle()
            return
        }

        // 7. BLOCK WEBSITES IN WEB BROWSERS
        if (BROWSER_PACKAGES.contains(packageName) && (blockedWebsites.isNotEmpty() || isBlockAdultContentEnabled || scheduleRestrictions?.blockAdultContent == true)) {
            handleBrowserEvent(rootNode, packageName)
            rootNode.recycle()
            return
        }

        // 8. BLOCK RECLAIM APP UNINSTALL IN ANDROID SETTINGS
        if (isBlockUninstallEnabled && packageName == SETTINGS_PACKAGE) {
            handleSettingsUninstallAttempt(rootNode)
        }

        rootNode.recycle()
    }

    private fun handleYouTubeEvent(
        event: AccessibilityEvent,
        rootNode: AccessibilityNodeInfo,
        now: Long,
        scheduleRestrictions: ScheduleRestrictions?
    ) {
        val result = detectionEngine.inspectNodeHierarchy(rootNode)
        Log.d("ReclaimOverlay", "handleYouTubeEvent: isShorts=${result.isShorts}, state=${result.state}, blocked=$isYouTubeShortsBlocked, passActive=${BlockingManager.isPassActive()}")

        val session = FocusSessionManager.instance
        val isSessionActive = session?.isSessionActive() == true

        // 1. YouTube Homepage Restriction
        val isHomepageBlocked = isYouTubeHomepageBlocked ||
                (isSessionActive && session?.isYouTubeHomepageBlocked() == true) ||
                (scheduleRestrictions?.blockYouTubeHomepage == true)

        if (result.state == ScreenState.YOUTUBE_HOME && isHomepageBlocked && !BlockingManager.isPassActive()) {
            BlockingManager.showBlockingScreen(
                this,
                "YOUTUBE_HOMEPAGE",
                "YouTube Homepage",
                "YouTube Homepage is blocked to prevent aimless browsing. Search and Subscriptions remain accessible.",
                YOUTUBE_PACKAGE
            )
            return
        }

        // 2. YouTube Shorts Restriction
        val isShortsBlocked = isYouTubeShortsBlocked ||
                (isSessionActive && session?.isYouTubeShortsBlocked() == true) ||
                (scheduleRestrictions?.blockYouTubeShorts == true)

        if (result.isShorts) {
            if (isShortsBlocked && !BlockingManager.isPassActive()) {
                if (BlockingManager.isTransitionGraceActive()) {
                    return
                }
                // Shorts is BLOCKED: Trigger in-app overlay covering Shorts content area,
                // preserving YouTube's original bottom navigation bar & system status bar.
                dynamicIslandManager.hideIsland()
                shortsOverlayBlocker.showOrUpdate(rootNode)
            } else {
                // Shorts is UNBLOCKED (or breather pass active):
                shortsOverlayBlocker.hide()

                val currentShortId = result.details.substringAfter("shortId=").takeIf { it != "null" }
                val isNewShort = currentShortId != null && currentShortId != lastObservedShortId
                val isScrollEvent = event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED &&
                        (now - lastScrollTimestamp > 800L)

                if (isNewShort || isScrollEvent) {
                    if (currentShortId != null) {
                        lastObservedShortId = currentShortId
                    }
                    lastScrollTimestamp = now
                    unblockedShortsScrolledCount++

                    if (isDynamicIslandEnabled) {
                        dynamicIslandManager.showOrUpdateIsland(unblockedShortsScrolledCount)
                    }
                    ReclaimNativeModule.notifyShortsScrolled(unblockedShortsScrolledCount)
                }
            }
        } else {
            // Screen is Normal YouTube (Home, Normal Video Player, Search, Subscriptions, etc.)
            // Remove overlay immediately so normal YouTube is completely usable without interference.
            if (result.state == ScreenState.YOUTUBE_HOME ||
                result.state == ScreenState.NORMAL_VIDEO_PLAYER ||
                result.state == ScreenState.YOUTUBE_SUBSCRIPTIONS ||
                result.state == ScreenState.YOUTUBE_SEARCH
            ) {
                shortsOverlayBlocker.hide()
            }

            if (unblockedShortsScrolledCount > 0) {
                mainHandler.postDelayed({
                    val activeRoot = rootInActiveWindow
                    if (activeRoot != null) {
                        val activeResult = detectionEngine.inspectNodeHierarchy(activeRoot)
                        activeRoot.recycle()
                        if (!activeResult.isShorts) {
                            dynamicIslandManager.hideIsland()
                        }
                    } else {
                        dynamicIslandManager.hideIsland()
                    }
                }, 1500L)
            }
        }
    }

    private fun getAppName(packageName: String): String {
        return try {
            val pm = packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            when (packageName) {
                YOUTUBE_PACKAGE -> "YouTube"
                INSTAGRAM_PACKAGE -> "Instagram"
                SNAPCHAT_PACKAGE -> "Snapchat"
                else -> packageName
            }
        }
    }

    private fun isInstagramReelsActive(root: AccessibilityNodeInfo): Boolean {
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)

        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()
            val viewId = node.viewIdResourceName?.lowercase() ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""

            if (viewId.contains("clips_viewer") ||
                viewId.contains("reel_viewer") ||
                viewId.contains("clips_video_container") ||
                ((desc.contains("reels") || desc.contains("reel")) && node.isSelected)
            ) {
                return true
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    queue.add(child)
                }
            }
        }
        return false
    }

    private fun handleInstagramEvent(event: AccessibilityEvent, root: AccessibilityNodeInfo, now: Long) {
        val isReels = isInstagramReelsActive(root)

        if (isReels) {
            val passActive = BlockingManager.isPassActive()
            if (isInstagramReelsBlocked && !passActive) {
                dynamicIslandManager.hideIsland()
                BlockingManager.showBlockingScreen(
                    this,
                    "REELS",
                    "IG Reels",
                    "Instagram Reels is blocked to protect your attention from infinite scrolling. Regular feed, profiles, and direct messages remain fully accessible.",
                    INSTAGRAM_PACKAGE
                )
            } else {
                // Reels is UNBLOCKED (or breather pass is active):
                // Show Dynamic Island live counter
                val isScrollEvent = event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED &&
                        (now - lastInstagramScrollTimestamp > 800L)

                if (isScrollEvent || unblockedReelsScrolledCount == 0) {
                    if (isScrollEvent) {
                        lastInstagramScrollTimestamp = now
                        unblockedReelsScrolledCount++
                    } else if (unblockedReelsScrolledCount == 0) {
                        unblockedReelsScrolledCount = 1
                        lastInstagramScrollTimestamp = now
                    }

                    if (isDynamicIslandEnabled) {
                        dynamicIslandManager.showOrUpdateIsland(unblockedReelsScrolledCount, "Reels")
                    }
                    ReclaimNativeModule.notifyShortsScrolled(unblockedReelsScrolledCount)
                }
            }
        } else {
            // User is in normal Instagram feed, profile, or messaging
            if (unblockedReelsScrolledCount > 0) {
                mainHandler.postDelayed({
                    val activeRoot = rootInActiveWindow
                    if (activeRoot != null) {
                        val activeIsReels = isInstagramReelsActive(activeRoot)
                        activeRoot.recycle()
                        if (!activeIsReels) {
                            dynamicIslandManager.hideIsland()
                        }
                    } else {
                        dynamicIslandManager.hideIsland()
                    }
                }, 1200L)
            }
        }
    }

    private fun handleSnapchatEvent(root: AccessibilityNodeInfo) {
        if (BlockingManager.isPassActive()) return

        var isSpotlight = false
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)

        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()
            val viewId = node.viewIdResourceName?.lowercase() ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""

            if (viewId.contains("spotlight") ||
                viewId.contains("vertical_view_pager") ||
                (desc.contains("spotlight") && node.isSelected)
            ) {
                isSpotlight = true
                break
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    queue.add(child)
                }
            }
        }

        if (isSpotlight) {
            BlockingManager.showBlockingScreen(
                this,
                "SPOTLIGHT",
                "Snapchat Spotlight",
                "Snapchat Spotlight is blocked to prevent compulsive algorithmic scrolling. Snaps, stories, and chats remain fully accessible.",
                SNAPCHAT_PACKAGE
            )
        }
    }

    private fun handleBrowserEvent(root: AccessibilityNodeInfo, browserPackage: String) {
        if (BlockingManager.isPassActive()) return

        // Search for URL bar
        var currentUrl: String? = null
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)

        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()
            val viewId = node.viewIdResourceName?.lowercase() ?: ""
            val text = node.text?.toString()?.lowercase() ?: ""

            if (viewId.contains("url_bar") ||
                viewId.contains("location_bar") ||
                viewId.contains("search_box") ||
                viewId.contains("address_bar")
            ) {
                if (text.isNotEmpty()) {
                    currentUrl = text
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

        if (currentUrl != null) {
            for (blocked in blockedWebsites) {
                if (currentUrl.contains(blocked)) {
                    BlockingManager.showBlockingScreen(
                        this,
                        "WEBSITE",
                        "Blocked Website",
                        "Access to $blocked is restricted by Reclaim to protect your focus and screen time.",
                        browserPackage
                    )
                    break
                }
            }
        }
    }

    private fun handleSettingsUninstallAttempt(root: AccessibilityNodeInfo) {
        var mentionsReclaim = false
        var mentionsUninstall = false

        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)

        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()
            val text = node.text?.toString()?.lowercase() ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""

            if (text.contains("reclaim") || desc.contains("reclaim")) {
                mentionsReclaim = true
            }
            if (text.contains("uninstall") || desc.contains("uninstall") || text.contains("force stop")) {
                mentionsUninstall = true
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    queue.add(child)
                }
            }
        }

        if (mentionsReclaim && mentionsUninstall) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            BlockingManager.showBlockingScreen(
                this,
                "UNINSTALL",
                "Uninstall Protection",
                "Reclaim Uninstall Protection is active. You cannot uninstall or modify Reclaim while Strict Mode protection is enabled.",
                SETTINGS_PACKAGE
            )
        }
    }

    private fun checkWindowModeViolations(root: AccessibilityNodeInfo, packageName: String): Boolean {
        if (BlockingManager.isPassActive()) return false

        // Only enforce on restricted packages (Shorts, Reels, Spotlight, limited apps)
        val isRestrictedApp = packageName == YOUTUBE_PACKAGE ||
                packageName == INSTAGRAM_PACKAGE ||
                packageName == SNAPCHAT_PACKAGE ||
                appLimits.any { it.packageName == packageName && it.enabled }

        if (!isRestrictedApp) return false

        val displayMetrics = DisplayMetrics()
        val windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        @Suppress("DEPRECATION")
        windowManager?.defaultDisplay?.getRealMetrics(displayMetrics)
        val screenWidth = displayMetrics.widthPixels
        val screenHeight = displayMetrics.heightPixels

        val bounds = Rect()
        root.getBoundsInScreen(bounds)

        // Split screen detection: height is significantly less than full screen (e.g. ~50%)
        if (isBlockSplitScreenEnabled) {
            val isSplit = bounds.height() > 0 && bounds.height() < (screenHeight * 0.72)
            if (isSplit) {
                BlockingManager.showBlockingScreen(
                    this,
                    "SPLIT_SCREEN",
                    "Split Screen Restricted",
                    "Blocked applications cannot be used in split-screen mode.",
                    packageName
                )
                return true
            }
        }

        // Floating window detection: both width and height are smaller than display
        if (isBlockFloatingWindowEnabled) {
            val isFloating = bounds.width() > 0 && bounds.height() > 0 &&
                    bounds.width() < (screenWidth * 0.85) &&
                    bounds.height() < (screenHeight * 0.85)
            if (isFloating) {
                BlockingManager.showBlockingScreen(
                    this,
                    "FLOATING_WINDOW",
                    "Floating Window Restricted",
                    "Blocked applications cannot be used in floating or freeform windows.",
                    packageName
                )
                return true
            }
        }

        return false
    }

    private fun formatMinutes(minutes: Int): String {
        val h = minutes / 60
        val m = minutes % 60
        return when {
            h > 0 && m > 0 -> "${h}h ${m}m"
            h > 0 -> "${h}h"
            else -> "${m}m"
        }
    }

    fun performBackAction(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_BACK)
    }

    fun navigateBackToNormalYouTube() {
        performGlobalAction(GLOBAL_ACTION_BACK)
        mainHandler.postDelayed({
            val root = rootInActiveWindow
            if (root != null) {
                if (root.packageName == YOUTUBE_PACKAGE) {
                    val homeNodes = root.findAccessibilityNodeInfosByText("Home")
                    for (node in homeNodes) {
                        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
                        val text = node.text?.toString()?.lowercase() ?: ""
                        if (desc == "home" || text == "home") {
                            if (node.isClickable) {
                                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            } else if (node.parent?.isClickable == true) {
                                node.parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            }
                            break
                        }
                    }
                }
                root.recycle()
            }
        }, 200L)
    }

    override fun onInterrupt() {
        if (::shortsOverlayBlocker.isInitialized) {
            shortsOverlayBlocker.hide()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        if (::shortsOverlayBlocker.isInitialized) {
            shortsOverlayBlocker.hide()
        }
        try {
            unregisterReceiver(reblockReceiver)
        } catch (_: Exception) {}
        dynamicIslandManager.hideIsland()
        ReclaimNativeModule.notifyPermissionChanged()
    }
}
