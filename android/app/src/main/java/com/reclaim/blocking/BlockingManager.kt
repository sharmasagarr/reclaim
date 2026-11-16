package com.reclaim.blocking

import android.content.Context
import android.content.Intent
import android.os.SystemClock
import com.reclaim.bridge.ReclaimNativeModule

object BlockingManager {

    @Volatile
    private var isBlockingVisible = false

    @Volatile
    private var lastLaunchTimestamp = 0L
    private const val LAUNCH_DEBOUNCE_MS = 1000L

    @Volatile
    private var temporaryPassExpiry: Long = 0

    @Volatile
    private var transitionGraceUntil: Long = 0

    fun isPassActive(): Boolean {
        return System.currentTimeMillis() < temporaryPassExpiry
    }

    fun isTransitionGraceActive(): Boolean {
        return SystemClock.uptimeMillis() < transitionGraceUntil
    }

    fun startTransitionGrace(durationMs: Long = 2500L) {
        transitionGraceUntil = SystemClock.uptimeMillis() + durationMs
    }

    fun grantTemporaryPass(minutes: Int) {
        temporaryPassExpiry = System.currentTimeMillis() + (minutes * 60 * 1000L)
    }

    fun revokeTemporaryPass() {
        temporaryPassExpiry = 0
        transitionGraceUntil = 0
    }

    @Synchronized
    fun showBlockingScreen(
        context: Context,
        blockType: String = "SHORTS",
        targetTitle: String = "YouTube Shorts",
        targetDetail: String = "YouTube Shorts is blocked to protect your attention from infinite algorithmic scrolling. Regular YouTube videos, search, and subscriptions remain fully accessible.",
        blockedPackage: String? = null
    ) {
        if (isPassActive()) {
            return
        }

        val now = SystemClock.uptimeMillis()
        if (isBlockingVisible && (now - lastLaunchTimestamp < LAUNCH_DEBOUNCE_MS)) {
            return
        }

        isBlockingVisible = true
        lastLaunchTimestamp = now

        // Notify React Native bridge of interception
        ReclaimNativeModule.notifyShortsBlocked()

        val intent = Intent(context, BlockingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("EXTRA_BLOCK_TYPE", blockType)
            putExtra("EXTRA_TARGET_TITLE", targetTitle)
            putExtra("EXTRA_TARGET_DETAIL", targetDetail)
            putExtra("EXTRA_BLOCKED_PACKAGE", blockedPackage)
        }
        context.startActivity(intent)
    }

    @Synchronized
    fun onBlockingScreenDismissed() {
        isBlockingVisible = false
    }
}
