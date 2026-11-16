package com.reclaim.admin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import com.reclaim.bridge.ReclaimNativeModule

class ReclaimDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "Reclaim Uninstall Protection Enabled", Toast.LENGTH_SHORT).show()
        ReclaimNativeModule.notifyProtectionChanged()
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "Deactivating Reclaim Device Administrator will allow the app to be uninstalled."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Toast.makeText(context, "Reclaim Uninstall Protection Disabled", Toast.LENGTH_SHORT).show()
        ReclaimNativeModule.notifyProtectionChanged()
    }
}

