package com.reclaim.stats

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Process
import java.util.Calendar

class UsageStatsHelper(private val context: Context) {

    companion object {
        private val DISTRACTING_PACKAGES = setOf(
            "com.google.android.youtube",
            "com.instagram.android",
            "com.facebook.katana",
            "com.zhiliaoapp.musically",
            "com.twitter.android",
            "com.snapchat.android"
        )
    }

    fun hasUsageStatsPermission(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun queryTodayUsage(): Pair<Int, Int> {
        if (!hasUsageStatsPermission()) {
            return Pair(0, 0)
        }

        val usageMap = queryAllAppsTodayUsage()
        var totalMinutes = 0
        var distractingMinutes = 0

        for ((pkg, minutes) in usageMap) {
            totalMinutes += minutes
            if (DISTRACTING_PACKAGES.contains(pkg)) {
                distractingMinutes += minutes
            }
        }

        return Pair(totalMinutes, distractingMinutes)
    }

    fun queryAllAppsTodayUsage(): Map<String, Int> {
        if (!hasUsageStatsPermission()) {
            return emptyMap()
        }

        val usageStatsManager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return emptyMap()

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startOfDay = calendar.timeInMillis
        val now = System.currentTimeMillis()

        val stats: List<UsageStats> =
            usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now)
                ?: emptyList()

        val resultMap = mutableMapOf<String, Int>()
        for (usage in stats) {
            val time = usage.totalTimeInForeground
            if (time > 0) {
                val current = resultMap[usage.packageName] ?: 0
                resultMap[usage.packageName] = current + (time / (1000 * 60)).toInt()
            }
        }
        return resultMap
    }

    fun queryPackageTodayUsageMinutes(packageName: String): Int {
        val all = queryAllAppsTodayUsage()
        return all[packageName] ?: 0
    }
}
