package com.reclaim.blocking

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.reclaim.MainActivity
import com.reclaim.R
import com.reclaim.accessibility.ReclaimAccessibilityService

class BlockingActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_blocking)

        val rootLayout = findViewById<View>(R.id.blocking_root_layout)
        val contentContainer = findViewById<View>(R.id.blocking_content_container)

        // Ensure safe top and bottom insets so UI never overlaps status bar or battery
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { _, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            contentContainer.setPadding(
                contentContainer.paddingLeft,
                systemBars.top + 24,
                contentContainer.paddingRight,
                systemBars.bottom + 24
            )
            insets
        }

        val tvIcon = findViewById<TextView>(R.id.tv_blocking_icon)
        val tvTitle = findViewById<TextView>(R.id.tv_blocking_title)
        val tvDescription = findViewById<TextView>(R.id.tv_blocking_description)
        val btnReturn = findViewById<Button>(R.id.btn_return_youtube)
        val btnOpenReclaim = findViewById<Button>(R.id.btn_open_reclaim)
        val btnBreather = findViewById<Button>(R.id.btn_take_breather)

        val blockType = intent.getStringExtra("EXTRA_BLOCK_TYPE") ?: "SHORTS"
        val targetTitle = intent.getStringExtra("EXTRA_TARGET_TITLE") ?: "Content Blocked"
        val targetDetail = intent.getStringExtra("EXTRA_TARGET_DETAIL")
            ?: "This content is blocked to protect your attention from infinite algorithmic scrolling."
        val blockedPackage = intent.getStringExtra("EXTRA_BLOCKED_PACKAGE")

        tvTitle.text = "You're here to reclaim your time."
        tvDescription.text = targetDetail

        when (blockType) {
            "SHORTS" -> {
                tvIcon.text = "🛡️"
                btnReturn.text = "Return to Normal YouTube"
            }
            "REELS" -> {
                tvIcon.text = "🎬"
                btnReturn.text = "Return to Instagram Home"
            }
            "SPOTLIGHT" -> {
                tvIcon.text = "👻"
                btnReturn.text = "Return to Snapchat"
            }
            "APP_LIMIT" -> {
                tvIcon.text = "⏳"
                btnReturn.text = "Close $targetTitle"
            }
            "WEBSITE" -> {
                tvIcon.text = "🌐"
                btnReturn.text = "Close Tab"
            }
            "SPLIT_SCREEN" -> {
                tvIcon.text = "📱"
                btnReturn.text = "Exit Split Screen"
            }
            "FLOATING_WINDOW" -> {
                tvIcon.text = "🪟"
                btnReturn.text = "Close Floating Window"
            }
        }

        btnReturn.setOnClickListener {
            handleReturnAction(blockedPackage, blockType)
        }

        btnOpenReclaim.setOnClickListener {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(intent)
            finish()
        }

        btnBreather.setOnClickListener {
            // Grant a 5-minute mindful pass
            BlockingManager.grantTemporaryPass(5)
            finish()
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                handleReturnAction(blockedPackage, blockType)
            }
        })
    }

    private fun handleReturnAction(blockedPackage: String?, blockType: String) {
        // Grant a 5-second grace pass so navigating back does not immediately re-trigger
        BlockingManager.grantTemporaryPass(1) // 1 minute mindful grace

        if (blockedPackage == "com.google.android.youtube" || blockType == "SHORTS") {
            ReclaimAccessibilityService.instance?.navigateBackToNormalYouTube()
            try {
                val launchIntent = packageManager.getLaunchIntentForPackage("com.google.android.youtube")?.apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
                }
                if (launchIntent != null) {
                    startActivity(launchIntent)
                }
            } catch (_: Exception) {}
        } else {
            ReclaimAccessibilityService.instance?.performBackAction()
        }
        finish()
    }

    override fun onPause() {
        super.onPause()
        BlockingManager.onBlockingScreenDismissed()
    }

    override fun onDestroy() {
        super.onDestroy()
        BlockingManager.onBlockingScreenDismissed()
    }
}
