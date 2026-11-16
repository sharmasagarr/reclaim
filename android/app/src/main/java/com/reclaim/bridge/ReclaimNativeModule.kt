package com.reclaim.bridge

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Base64
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.reclaim.accessibility.ReclaimAccessibilityService
import com.reclaim.admin.ReclaimDeviceAdminReceiver
import com.reclaim.schedule.ScheduleManager
import com.reclaim.session.FocusSessionManager
import com.reclaim.stats.UsageStatsHelper
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class ReclaimNativeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "ReclaimModule"

        @Volatile
        var reactAppContext: ReactApplicationContext? = null

        fun sendEvent(eventName: String, params: WritableMap?) {
            reactAppContext?.let { ctx ->
                if (ctx.hasActiveReactInstance()) {
                    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, params)
                }
            }
        }

        fun notifyShortsBlocked() {
            val params = Arguments.createMap().apply {
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            sendEvent("onShortsBlocked", params)
        }

        fun notifyShortsScrolled(count: Int) {
            val params = Arguments.createMap().apply {
                putInt("count", count)
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            sendEvent("onShortsScrolled", params)
        }

        fun notifySessionUpdate(remainingSeconds: Int, isActive: Boolean) {
            val params = Arguments.createMap().apply {
                putInt("remainingSeconds", remainingSeconds)
                putBoolean("isActive", isActive)
            }
            sendEvent("onFocusSessionUpdate", params)
        }

        fun notifyPermissionChanged() {
            sendEvent("onPermissionStatusChanged", null)
        }

        fun notifyBlockingConfigChanged(isBlocked: Boolean) {
            val params = Arguments.createMap().apply {
                putBoolean("isBlocked", isBlocked)
            }
            sendEvent("onShortsBlockedConfigChanged", params)
        }

        fun notifyProtectionChanged() {
            sendEvent("onProtectionStatusChanged", null)
        }
    }

    private val usageStatsHelper = UsageStatsHelper(reactContext)

    init {
        reactAppContext = reactContext
        FocusSessionManager.initialize(reactContext)
        ScheduleManager.initialize(reactContext)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val dpm = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val adminComponent = ComponentName(reactContext, ReclaimDeviceAdminReceiver::class.java)
            val isDeviceAdmin = dpm?.isAdminActive(adminComponent) == true

            val map = Arguments.createMap().apply {
                putBoolean("accessibilityGranted", ReclaimAccessibilityService.instance != null)
                putBoolean("usageStatsGranted", usageStatsHelper.hasUsageStatsPermission())
                putBoolean("overlayGranted", Settings.canDrawOverlays(reactContext))
                putBoolean(
                    "notificationGranted",
                    NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
                )
                putBoolean("deviceAdminGranted", isDeviceAdmin)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSIONS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestPermission(type: String, promise: Promise) {
        try {
            when (type) {
                "accessibility" -> {
                    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactContext.startActivity(intent)
                }
                "usageStats" -> {
                    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactContext.startActivity(intent)
                }
                "overlay" -> {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${reactContext.packageName}")
                    ).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactContext.startActivity(intent)
                }
                "notifications" -> {
                    val activity = reactContext.currentActivity
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && activity != null) {
                        activity.requestPermissions(
                            arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                            101
                        )
                    } else {
                        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                        } else {
                            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = Uri.parse("package:${reactContext.packageName}")
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                        }
                        reactContext.startActivity(intent)
                    }
                }
                "deviceAdmin" -> {
                    val adminComponent = ComponentName(reactContext, ReclaimDeviceAdminReceiver::class.java)
                    val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                        putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                        putExtra(
                            DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                            "Enable Reclaim Device Admin to activate uninstall protection and prevent accidental app removal."
                        )
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactContext.startActivity(intent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REQUEST_PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        Thread {
            try {
                val pm = reactContext.packageManager
                val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
                val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
                val usageMap = usageStatsHelper.queryAllAppsTodayUsage()

                val array = Arguments.createArray()
                val seenPackages = HashSet<String>()

                for (info in resolveInfos) {
                    val pkgName = info.activityInfo.packageName
                    if (pkgName == reactContext.packageName || seenPackages.contains(pkgName)) {
                        continue
                    }
                    seenPackages.add(pkgName)

                    val appName = info.loadLabel(pm)?.toString() ?: pkgName
                    val iconDrawable = info.loadIcon(pm)
                    val iconBase64 = drawableToBase64(iconDrawable)
                    val usageMinutes = usageMap[pkgName] ?: 0

                    val item = Arguments.createMap().apply {
                        putString("packageName", pkgName)
                        putString("appName", appName)
                        if (iconBase64 != null) {
                            putString("iconUri", iconBase64)
                        }
                        putInt("todayUsageMinutes", usageMinutes)
                    }
                    array.pushMap(item)
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("GET_INSTALLED_APPS_ERROR", e.message)
            }
        }.start()
    }

    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
                drawable.bitmap
            } else {
                val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth.coerceAtMost(96) else 64
                val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight.coerceAtMost(96) else 64
                val bm = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bm)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                bm
            }
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, outputStream)
            val byteArray = outputStream.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (_: Exception) {
            null
        }
    }

    @ReactMethod
    fun setAppLimits(limits: ReadableArray, promise: Promise) {
        try {
            val jsonArr = JSONArray()
            for (i in 0 until limits.size()) {
                val map = limits.getMap(i) ?: continue
                val obj = JSONObject().apply {
                    put("packageName", map.getString("packageName"))
                    put("appName", map.getString("appName"))
                    put("limitMinutes", map.getInt("limitMinutes"))
                    put("enabled", if (map.hasKey("enabled")) map.getBoolean("enabled") else true)
                }
                jsonArr.put(obj)
            }

            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(ReclaimAccessibilityService.KEY_APP_LIMITS, jsonArr.toString()).apply()

            ReclaimAccessibilityService.instance?.loadPersistedConfig()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_APP_LIMITS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getAppLimits(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(ReclaimAccessibilityService.KEY_APP_LIMITS, "[]") ?: "[]"
            val arr = JSONArray(jsonStr)
            val usageMap = usageStatsHelper.queryAllAppsTodayUsage()

            val result = Arguments.createArray()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val pkg = obj.getString("packageName")
                val item = Arguments.createMap().apply {
                    putString("packageName", pkg)
                    putString("appName", obj.optString("appName", pkg))
                    putInt("limitMinutes", obj.getInt("limitMinutes"))
                    putBoolean("enabled", obj.optBoolean("enabled", true))
                    putInt("todayUsageMinutes", usageMap[pkg] ?: 0)
                }
                result.pushMap(item)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_APP_LIMITS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setBlockedWebsites(websites: ReadableArray, promise: Promise) {
        try {
            val jsonArr = JSONArray()
            for (i in 0 until websites.size()) {
                val site = websites.getString(i)
                if (!site.isNullOrBlank()) {
                    jsonArr.put(site.trim().lowercase())
                }
            }

            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(ReclaimAccessibilityService.KEY_BLOCKED_WEBSITES, jsonArr.toString()).apply()

            ReclaimAccessibilityService.instance?.loadPersistedConfig()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_BLOCKED_WEBSITES_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getBlockedWebsites(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(ReclaimAccessibilityService.KEY_BLOCKED_WEBSITES, "[]") ?: "[]"
            val arr = JSONArray(jsonStr)
            val result = Arguments.createArray()
            for (i in 0 until arr.length()) {
                result.pushString(arr.getString(i))
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_BLOCKED_WEBSITES_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setProtections(protections: ReadableMap, promise: Promise) {
        try {
            val blockUninstall = if (protections.hasKey("blockUninstall")) protections.getBoolean("blockUninstall") else false
            val blockSplitScreen = if (protections.hasKey("blockSplitScreen")) protections.getBoolean("blockSplitScreen") else false
            val blockFloatingWindow = if (protections.hasKey("blockFloatingWindow")) protections.getBoolean("blockFloatingWindow") else false

            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean(ReclaimAccessibilityService.KEY_BLOCK_UNINSTALL, blockUninstall)
                .putBoolean(ReclaimAccessibilityService.KEY_BLOCK_SPLIT_SCREEN, blockSplitScreen)
                .putBoolean(ReclaimAccessibilityService.KEY_BLOCK_FLOATING_WINDOW, blockFloatingWindow)
                .apply()

            ReclaimAccessibilityService.instance?.loadPersistedConfig()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_PROTECTIONS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getProtections(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            val dpm = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val adminComponent = ComponentName(reactContext, ReclaimDeviceAdminReceiver::class.java)
            val isAdmin = dpm?.isAdminActive(adminComponent) == true

            val map = Arguments.createMap().apply {
                putBoolean("blockUninstall", prefs.getBoolean(ReclaimAccessibilityService.KEY_BLOCK_UNINSTALL, false))
                putBoolean("blockSplitScreen", prefs.getBoolean(ReclaimAccessibilityService.KEY_BLOCK_SPLIT_SCREEN, false))
                putBoolean("blockFloatingWindow", prefs.getBoolean(ReclaimAccessibilityService.KEY_BLOCK_FLOATING_WINDOW, false))
                putBoolean("deviceAdminActive", isAdmin)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_PROTECTIONS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setBlockingConfig(config: ReadableMap, promise: Promise) {
        try {
            val youtubeCompletelyBlocked = if (config.hasKey("youtubeCompletelyBlocked")) config.getBoolean("youtubeCompletelyBlocked") else false
            val youtubeHomepageBlocked = if (config.hasKey("youtubeHomepageBlocked")) config.getBoolean("youtubeHomepageBlocked") else false
            val shortsBlocked = if (config.hasKey("youtubeShortsBlocked")) config.getBoolean("youtubeShortsBlocked") else true
            val instagramCompletelyBlocked = if (config.hasKey("instagramCompletelyBlocked")) config.getBoolean("instagramCompletelyBlocked") else false
            val reelsBlocked = if (config.hasKey("instagramReelsBlocked")) config.getBoolean("instagramReelsBlocked") else true
            val spotlightBlocked = if (config.hasKey("snapchatSpotlightBlocked")) config.getBoolean("snapchatSpotlightBlocked") else true
            val islandEnabled = if (config.hasKey("dynamicIslandLiveCounterEnabled")) config.getBoolean("dynamicIslandLiveCounterEnabled") else true
            val adultContent = if (config.hasKey("blockAdultContent")) config.getBoolean("blockAdultContent") else false
            val studyMode = if (config.hasKey("studyMode")) config.getBoolean("studyMode") else false

            val pkgsArr = JSONArray()
            if (config.hasKey("blockedPackages")) {
                val array = config.getArray("blockedPackages")
                if (array != null) {
                    for (i in 0 until array.size()) {
                        array.getString(i)?.let { pkgsArr.put(it) }
                    }
                }
            }

            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean(ReclaimAccessibilityService.KEY_YOUTUBE_COMPLETELY_BLOCKED, youtubeCompletelyBlocked)
                .putBoolean(ReclaimAccessibilityService.KEY_YOUTUBE_HOMEPAGE_BLOCKED, youtubeHomepageBlocked)
                .putBoolean(ReclaimAccessibilityService.KEY_SHORTS_BLOCKED, shortsBlocked)
                .putBoolean(ReclaimAccessibilityService.KEY_INSTAGRAM_COMPLETELY_BLOCKED, instagramCompletelyBlocked)
                .putBoolean(ReclaimAccessibilityService.KEY_REELS_BLOCKED, reelsBlocked)
                .putBoolean(ReclaimAccessibilityService.KEY_SPOTLIGHT_BLOCKED, spotlightBlocked)
                .putBoolean(ReclaimAccessibilityService.KEY_DYNAMIC_ISLAND, islandEnabled)
                .putBoolean(ReclaimAccessibilityService.KEY_BLOCK_ADULT_CONTENT, adultContent)
                .putBoolean(ReclaimAccessibilityService.KEY_STUDY_MODE, studyMode)
                .putString(ReclaimAccessibilityService.KEY_BLOCKED_PACKAGES, pkgsArr.toString())
                .apply()

            ReclaimAccessibilityService.instance?.loadPersistedConfig()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_CONFIG_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getBlockingConfig(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(ReclaimAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
            val pkgsJson = prefs.getString(ReclaimAccessibilityService.KEY_BLOCKED_PACKAGES, "[]") ?: "[]"
            val pkgsArr = JSONArray(pkgsJson)
            val pkgsList = Arguments.createArray()
            for (i in 0 until pkgsArr.length()) {
                pkgsList.pushString(pkgsArr.getString(i))
            }

            val map = Arguments.createMap().apply {
                putBoolean("youtubeCompletelyBlocked", prefs.getBoolean(ReclaimAccessibilityService.KEY_YOUTUBE_COMPLETELY_BLOCKED, false))
                putBoolean("youtubeHomepageBlocked", prefs.getBoolean(ReclaimAccessibilityService.KEY_YOUTUBE_HOMEPAGE_BLOCKED, false))
                putBoolean("youtubeShortsBlocked", prefs.getBoolean(ReclaimAccessibilityService.KEY_SHORTS_BLOCKED, true))
                putBoolean("instagramCompletelyBlocked", prefs.getBoolean(ReclaimAccessibilityService.KEY_INSTAGRAM_COMPLETELY_BLOCKED, false))
                putBoolean("instagramReelsBlocked", prefs.getBoolean(ReclaimAccessibilityService.KEY_REELS_BLOCKED, true))
                putBoolean("snapchatSpotlightBlocked", prefs.getBoolean(ReclaimAccessibilityService.KEY_SPOTLIGHT_BLOCKED, true))
                putBoolean("dynamicIslandLiveCounterEnabled", prefs.getBoolean(ReclaimAccessibilityService.KEY_DYNAMIC_ISLAND, true))
                putBoolean("blockAdultContent", prefs.getBoolean(ReclaimAccessibilityService.KEY_BLOCK_ADULT_CONTENT, false))
                putBoolean("studyMode", prefs.getBoolean(ReclaimAccessibilityService.KEY_STUDY_MODE, false))
                putArray("blockedPackages", pkgsList)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_CONFIG_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setSchedules(schedulesJson: String, promise: Promise) {
        try {
            ScheduleManager.instance?.saveSchedules(schedulesJson)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_SCHEDULES_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getSchedules(promise: Promise) {
        try {
            val json = ScheduleManager.instance?.getSchedulesJson() ?: "[]"
            promise.resolve(json)
        } catch (e: Exception) {
            promise.reject("GET_SCHEDULES_ERROR", e.message)
        }
    }

    @ReactMethod
    fun startFocusSession(config: ReadableMap, promise: Promise) {
        try {
            val durationMinutes = if (config.hasKey("durationMinutes")) config.getInt("durationMinutes") else 25
            val strictMode = if (config.hasKey("strictMode")) config.getBoolean("strictMode") else false
            val mode = if (config.hasKey("mode")) config.getString("mode") ?: "timer" else "timer"
            val tag = if (config.hasKey("tag")) config.getString("tag") ?: "Untagged" else "Untagged"
            val blockShorts = if (config.hasKey("blockYouTubeShorts")) config.getBoolean("blockYouTubeShorts") else true
            val blockHomepage = if (config.hasKey("blockYouTubeHomepage")) config.getBoolean("blockYouTubeHomepage") else false
            val blockYouTubeCompletely = if (config.hasKey("blockYouTubeCompletely")) config.getBoolean("blockYouTubeCompletely") else false

            val blockedPackages = mutableListOf<String>()
            if (config.hasKey("blockedPackages")) {
                val array = config.getArray("blockedPackages")
                if (array != null) {
                    for (i in 0 until array.size()) {
                        array.getString(i)?.let { blockedPackages.add(it) }
                    }
                }
            }

            FocusSessionManager.instance?.startSession(
                durationMinutes = durationMinutes,
                strictMode = strictMode,
                blockedPackages = blockedPackages,
                blockYouTubeShorts = blockShorts,
                blockYouTubeHomepage = blockHomepage,
                blockYouTubeCompletely = blockYouTubeCompletely,
                mode = mode,
                tag = tag
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SESSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun pauseFocusSession(promise: Promise) {
        try {
            FocusSessionManager.instance?.pauseSession()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PAUSE_SESSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun resumeFocusSession(promise: Promise) {
        try {
            FocusSessionManager.instance?.resumeSession()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESUME_SESSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopFocusSession(promise: Promise) {
        try {
            FocusSessionManager.instance?.stopSession()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SESSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getFocusSessionState(promise: Promise) {
        try {
            val session = FocusSessionManager.instance
            val map = Arguments.createMap().apply {
                putBoolean("isActive", session?.isSessionActive() == true)
                putBoolean("isPaused", session?.isPaused() == true)
                putInt("remainingSeconds", session?.getRemainingSeconds() ?: 0)
                putBoolean("strictMode", session?.isStrictMode() == true)
                putString("mode", session?.getMode() ?: "timer")
                putString("tag", session?.getTag() ?: "Untagged")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_SESSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getDailyStatistics(promise: Promise) {
        try {
            val (todayMins, distractingMins) = usageStatsHelper.queryTodayUsage()
            val map = Arguments.createMap().apply {
                putInt("todayScreenTimeMinutes", todayMins)
                putInt("distractingTimeMinutes", distractingMins)
                putInt("shortsBlocksCount", 0)
                putInt("unblockedShortsScrolledCount", 0)
                putInt("focusSessionsCompleted", 0)
                putInt("totalFocusMinutes", 0)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("STATS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setDynamicIslandCounter(enabled: Boolean, promise: Promise) {
        ReclaimAccessibilityService.instance?.isDynamicIslandEnabled = enabled
        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter
    }
}
