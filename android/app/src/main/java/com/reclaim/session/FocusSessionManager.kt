package com.reclaim.session

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.reclaim.bridge.ReclaimNativeModule
import org.json.JSONArray

class FocusSessionManager(private val context: Context) {

    companion object {
        private const val PREFS_NAME = "reclaim_focus_session_prefs"
        private const val KEY_START_ELAPSED = "key_start_elapsed"
        private const val KEY_DURATION_MINUTES = "key_duration_minutes"
        private const val KEY_IS_ACTIVE = "key_is_active"
        private const val KEY_STRICT_MODE = "key_strict_mode"
        private const val KEY_BLOCKED_PACKAGES = "key_session_blocked_packages"
        private const val KEY_BLOCK_YT_SHORTS = "key_session_block_yt_shorts"
        private const val KEY_BLOCK_YT_HOME = "key_session_block_yt_home"
        private const val KEY_BLOCK_YT_COMPLETE = "key_session_block_yt_complete"
        private const val KEY_MODE = "key_session_mode"
        private const val KEY_TAG = "key_session_tag"
        private const val KEY_IS_PAUSED = "key_session_is_paused"
        private const val KEY_PAUSED_REMAINING = "key_session_paused_remaining"

        @Volatile
        var instance: FocusSessionManager? = null
            private set

        fun initialize(context: Context): FocusSessionManager {
            val mgr = FocusSessionManager(context.applicationContext)
            instance = mgr
            return mgr
        }
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val mainHandler = Handler(Looper.getMainLooper())
    private var tickerRunnable: Runnable? = null

    init {
        instance = this
        restoreSessionIfActive()
    }

    fun startSession(
        durationMinutes: Int,
        strictMode: Boolean,
        blockedPackages: List<String> = emptyList(),
        blockYouTubeShorts: Boolean = true,
        blockYouTubeHomepage: Boolean = false,
        blockYouTubeCompletely: Boolean = false,
        mode: String = "timer",
        tag: String = "Untagged"
    ) {
        val nowElapsed = SystemClock.elapsedRealtime()
        val pkgsJson = JSONArray(blockedPackages).toString()

        prefs.edit()
            .putLong(KEY_START_ELAPSED, nowElapsed)
            .putInt(KEY_DURATION_MINUTES, durationMinutes)
            .putBoolean(KEY_IS_ACTIVE, true)
            .putBoolean(KEY_STRICT_MODE, strictMode)
            .putBoolean(KEY_IS_PAUSED, false)
            .putInt(KEY_PAUSED_REMAINING, durationMinutes * 60)
            .putString(KEY_BLOCKED_PACKAGES, pkgsJson)
            .putBoolean(KEY_BLOCK_YT_SHORTS, blockYouTubeShorts)
            .putBoolean(KEY_BLOCK_YT_HOME, blockYouTubeHomepage)
            .putBoolean(KEY_BLOCK_YT_COMPLETE, blockYouTubeCompletely)
            .putString(KEY_MODE, mode)
            .putString(KEY_TAG, tag)
            .apply()

        startTicker()
    }

    fun pauseSession() {
        if (!isSessionActive() || isStrictMode()) return
        val remaining = getRemainingSeconds()
        prefs.edit()
            .putBoolean(KEY_IS_PAUSED, true)
            .putInt(KEY_PAUSED_REMAINING, remaining)
            .apply()

        stopTicker()
        ReclaimNativeModule.notifySessionUpdate(remaining, true)
    }

    fun resumeSession() {
        if (!prefs.getBoolean(KEY_IS_ACTIVE, false)) return
        val pausedRemaining = prefs.getInt(KEY_PAUSED_REMAINING, 0)
        val durationMins = prefs.getInt(KEY_DURATION_MINUTES, 0)
        val totalMillis = durationMins * 60 * 1000L
        val simulatedStartElapsed = SystemClock.elapsedRealtime() - (totalMillis - (pausedRemaining * 1000L))

        prefs.edit()
            .putBoolean(KEY_IS_PAUSED, false)
            .putLong(KEY_START_ELAPSED, simulatedStartElapsed)
            .apply()

        startTicker()
    }

    fun stopSession() {
        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, false)
            .putBoolean(KEY_IS_PAUSED, false)
            .apply()

        stopTicker()
        ReclaimNativeModule.notifySessionUpdate(0, false)
    }

    fun isSessionActive(): Boolean {
        if (!prefs.getBoolean(KEY_IS_ACTIVE, false)) return false
        if (prefs.getBoolean(KEY_IS_PAUSED, false)) return true

        val remaining = getRemainingSeconds()
        if (remaining <= 0) {
            stopSession()
            return false
        }
        return true
    }

    fun isPaused(): Boolean = prefs.getBoolean(KEY_IS_PAUSED, false)

    fun isStrictMode(): Boolean = prefs.getBoolean(KEY_STRICT_MODE, false)

    fun getRemainingSeconds(): Int {
        if (!prefs.getBoolean(KEY_IS_ACTIVE, false)) return 0
        if (prefs.getBoolean(KEY_IS_PAUSED, false)) {
            return prefs.getInt(KEY_PAUSED_REMAINING, 0)
        }
        val startElapsed = prefs.getLong(KEY_START_ELAPSED, 0L)
        val durationMins = prefs.getInt(KEY_DURATION_MINUTES, 0)
        val totalMillis = durationMins * 60 * 1000L
        val elapsed = SystemClock.elapsedRealtime() - startElapsed
        val remainingMillis = totalMillis - elapsed
        return if (remainingMillis > 0) (remainingMillis / 1000).toInt() else 0
    }

    fun getBlockedPackages(): Set<String> {
        val jsonStr = prefs.getString(KEY_BLOCKED_PACKAGES, "[]") ?: "[]"
        return try {
            val arr = JSONArray(jsonStr)
            val set = mutableSetOf<String>()
            for (i in 0 until arr.length()) set.add(arr.getString(i))
            set
        } catch (_: Exception) {
            emptySet()
        }
    }

    fun isPackageBlocked(packageName: String): Boolean {
        if (!isSessionActive()) return false
        return getBlockedPackages().contains(packageName)
    }

    fun isYouTubeShortsBlocked(): Boolean =
        isSessionActive() && prefs.getBoolean(KEY_BLOCK_YT_SHORTS, true)

    fun isYouTubeHomepageBlocked(): Boolean =
        isSessionActive() && prefs.getBoolean(KEY_BLOCK_YT_HOME, false)

    fun isYouTubeCompletelyBlocked(): Boolean =
        isSessionActive() && prefs.getBoolean(KEY_BLOCK_YT_COMPLETE, false)

    fun getTag(): String = prefs.getString(KEY_TAG, "Untagged") ?: "Untagged"

    fun getMode(): String = prefs.getString(KEY_MODE, "timer") ?: "timer"

    private fun restoreSessionIfActive() {
        if (prefs.getBoolean(KEY_IS_ACTIVE, false)) {
            if (prefs.getBoolean(KEY_IS_PAUSED, false)) {
                // Was paused, keep state
                return
            }
            val remaining = getRemainingSeconds()
            if (remaining > 0) {
                startTicker()
            } else {
                stopSession()
            }
        }
    }

    private fun startTicker() {
        stopTicker()
        tickerRunnable = object : Runnable {
            override fun run() {
                val remaining = getRemainingSeconds()
                if (remaining > 0) {
                    ReclaimNativeModule.notifySessionUpdate(remaining, true)
                    mainHandler.postDelayed(this, 1000L)
                } else {
                    stopSession()
                }
            }
        }
        mainHandler.post(tickerRunnable!!)
    }

    private fun stopTicker() {
        tickerRunnable?.let { mainHandler.removeCallbacks(it) }
        tickerRunnable = null
    }
}
