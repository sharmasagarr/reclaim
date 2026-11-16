package com.reclaim.island

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.reclaim.MainActivity
import com.reclaim.R

class DynamicIslandManager(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "reclaim_live_island"
        const val NOTIFICATION_ID = 9001
        const val ACTION_REBLOCK = "com.reclaim.action.REBLOCK_SHORTS"
    }

    private val notificationManager: NotificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Dynamic Island Live Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows live count of watched Shorts/Reels in Dynamic Island / Aqua Dynamics"
                setShowBadge(true)
                enableVibration(false)
                setSound(null, null)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun showOrUpdateIsland(count: Int, contentType: String = "Shorts") {
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            context,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action to instantly re-block
        val reblockIntent = Intent(ACTION_REBLOCK).apply {
            setPackage(context.packageName)
        }
        val reblockPendingIntent = PendingIntent.getBroadcast(
            context,
            1,
            reblockIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Reclaim: $contentType Unblocked")
            .setContentText("⚡ $count $contentType scrolled | Tap to re-block")
            .setSubText("$count $contentType")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openAppPendingIntent)
            .addAction(
                android.R.drawable.ic_lock_power_off,
                "Re-block Now",
                reblockPendingIntent
            )
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    fun hideIsland() {
        notificationManager.cancel(NOTIFICATION_ID)
    }
}

