package com.reclaim.schedule

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

data class ScheduleModel(
    val id: String,
    val title: String,
    val startTime: String, // "HH:mm"
    val endTime: String,   // "HH:mm"
    val daysOfWeek: Set<Int>, // 1 = Monday .. 7 = Sunday
    val enabled: Boolean,
    val blockedPackages: Set<String>,
    val blockYouTubeShorts: Boolean,
    val blockYouTubeHomepage: Boolean,
    val blockYouTubeCompletely: Boolean,
    val blockAdultContent: Boolean
)

data class ScheduleRestrictions(
    val blockedPackages: Set<String>,
    val blockYouTubeShorts: Boolean,
    val blockYouTubeHomepage: Boolean,
    val blockYouTubeCompletely: Boolean,
    val blockAdultContent: Boolean,
    val activeScheduleTitles: List<String>
)

class ScheduleManager(private val context: Context) {

    companion object {
        private const val TAG = "ScheduleManager"
        const val PREFS_NAME = "reclaim_schedule_prefs"
        const val KEY_SCHEDULES_JSON = "key_schedules_json"

        @Volatile
        var instance: ScheduleManager? = null
            private set

        fun initialize(context: Context): ScheduleManager {
            val mgr = ScheduleManager(context.applicationContext)
            instance = mgr
            return mgr
        }
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    @Volatile
    private var schedulesList: List<ScheduleModel> = emptyList()

    init {
        instance = this
        loadSchedules()
    }

    fun loadSchedules() {
        val jsonStr = prefs.getString(KEY_SCHEDULES_JSON, "[]") ?: "[]"
        try {
            val jsonArr = JSONArray(jsonStr)
            val list = mutableListOf<ScheduleModel>()
            for (i in 0 until jsonArr.length()) {
                val obj = jsonArr.getJSONObject(i)
                val daysArr = obj.optJSONArray("daysOfWeek") ?: JSONArray()
                val daysSet = mutableSetOf<Int>()
                for (d in 0 until daysArr.length()) {
                    daysSet.add(daysArr.getInt(d))
                }

                val pkgsArr = obj.optJSONArray("blockedPackages") ?: JSONArray()
                val pkgsSet = mutableSetOf<String>()
                for (p in 0 until pkgsArr.length()) {
                    pkgsSet.add(pkgsArr.getString(p))
                }

                list.add(
                    ScheduleModel(
                        id = obj.optString("id", System.currentTimeMillis().toString()),
                        title = obj.optString("title", "Schedule"),
                        startTime = obj.optString("startTime", "09:00"),
                        endTime = obj.optString("endTime", "18:00"),
                        daysOfWeek = daysSet,
                        enabled = obj.optBoolean("enabled", true),
                        blockedPackages = pkgsSet,
                        blockYouTubeShorts = obj.optBoolean("blockYouTubeShorts", true),
                        blockYouTubeHomepage = obj.optBoolean("blockYouTubeHomepage", false),
                        blockYouTubeCompletely = obj.optBoolean("blockYouTubeCompletely", false),
                        blockAdultContent = obj.optBoolean("blockAdultContent", false)
                    )
                )
            }
            schedulesList = list
            Log.d(TAG, "Loaded ${list.size} schedules from local persistence")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load schedules: ${e.message}")
        }
    }

    fun saveSchedules(jsonString: String) {
        prefs.edit().putString(KEY_SCHEDULES_JSON, jsonString).apply()
        loadSchedules()
    }

    fun getSchedulesJson(): String {
        return prefs.getString(KEY_SCHEDULES_JSON, "[]") ?: "[]"
    }

    /**
     * Evaluates all currently active schedules for the current day and minute.
     * Maps Calendar.DAY_OF_WEEK (Sun=1..Sat=7) to 1=Mon..7=Sun.
     */
    fun getActiveRestrictions(): ScheduleRestrictions {
        val calendar = Calendar.getInstance()
        val currentDay = when (calendar.get(Calendar.DAY_OF_WEEK)) {
            Calendar.MONDAY -> 1
            Calendar.TUESDAY -> 2
            Calendar.WEDNESDAY -> 3
            Calendar.THURSDAY -> 4
            Calendar.FRIDAY -> 5
            Calendar.SATURDAY -> 6
            Calendar.SUNDAY -> 7
            else -> 1
        }

        val currentMinute = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE)

        val combinedBlockedPackages = mutableSetOf<String>()
        var combinedYouTubeShorts = false
        var combinedYouTubeHomepage = false
        var combinedYouTubeCompletely = false
        var combinedAdultContent = false
        val activeTitles = mutableListOf<String>()

        for (schedule in schedulesList) {
            if (!schedule.enabled) continue
            if (!schedule.daysOfWeek.contains(currentDay)) continue

            val startMinute = parseTimeToMinutes(schedule.startTime)
            val endMinute = parseTimeToMinutes(schedule.endTime)

            val isActive = if (startMinute <= endMinute) {
                // Same-day window (e.g. 09:00 to 18:00)
                currentMinute in startMinute..endMinute
            } else {
                // Overnight window (e.g. 22:00 to 06:00)
                currentMinute >= startMinute || currentMinute <= endMinute
            }

            if (isActive) {
                activeTitles.add(schedule.title)
                combinedBlockedPackages.addAll(schedule.blockedPackages)
                if (schedule.blockYouTubeShorts) combinedYouTubeShorts = true
                if (schedule.blockYouTubeHomepage) combinedYouTubeHomepage = true
                if (schedule.blockYouTubeCompletely) combinedYouTubeCompletely = true
                if (schedule.blockAdultContent) combinedAdultContent = true
            }
        }

        return ScheduleRestrictions(
            blockedPackages = combinedBlockedPackages,
            blockYouTubeShorts = combinedYouTubeShorts,
            blockYouTubeHomepage = combinedYouTubeHomepage,
            blockYouTubeCompletely = combinedYouTubeCompletely,
            blockAdultContent = combinedAdultContent,
            activeScheduleTitles = activeTitles
        )
    }

    fun isPackageBlocked(packageName: String): Boolean {
        return getActiveRestrictions().blockedPackages.contains(packageName)
    }

    private fun parseTimeToMinutes(timeStr: String): Int {
        return try {
            val parts = timeStr.trim().split(":")
            val h = parts[0].toInt()
            val m = parts[1].toInt()
            h * 60 + m
        } catch (_: Exception) {
            0
        }
    }
}

