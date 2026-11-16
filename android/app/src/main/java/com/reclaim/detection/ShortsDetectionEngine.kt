package com.reclaim.detection

import android.view.accessibility.AccessibilityNodeInfo

class ShortsDetectionEngine {

    companion object {
        private const val CONFIDENCE_THRESHOLD = 50
    }

    data class InspectionContext(
        var hasShortsTabSelected: Boolean = false,
        var hasHomeTabSelected: Boolean = false,
        var hasSubscriptionsTabSelected: Boolean = false,
        var hasReelContainer: Boolean = false,
        var hasReelRecycler: Boolean = false,
        var hasReelWatchPlayer: Boolean = false,
        var hasReelWatchFragment: Boolean = false,
        var hasReelPageContainer: Boolean = false,
        var hasShortsActionButtons: Boolean = false,
        var hasNormalWatchPlayer: Boolean = false,
        var hasNormalVideoScrubber: Boolean = false,
        var hasVideoDurationText: Boolean = false,
        var hasNormalVideoDescription: Boolean = false,
        var hasHomeFeedList: Boolean = false,
        var hasSearchBar: Boolean = false,
        var likeButtonCount: Int = 0,
        var soundPivotCount: Int = 0,
        var currentShortIdentifier: String? = null
    )

    fun inspectNodeHierarchy(root: AccessibilityNodeInfo?): DetectionResult {
        if (root == null) {
            return DetectionResult(ScreenState.UNKNOWN, 0, "Root node is null", false)
        }

        val context = InspectionContext()
        traverseNodes(root, context, 0)

        // Compute scores
        var shortsScore = 0
        var normalPlayerScore = 0
        var homeScore = 0

        // Shorts positive weights
        if (context.hasReelRecycler) shortsScore += 50
        if (context.hasReelWatchPlayer) shortsScore += 50
        if (context.hasReelWatchFragment) shortsScore += 40
        if (context.hasShortsTabSelected) shortsScore += 45
        if (context.hasReelPageContainer) shortsScore += 30
        if (context.hasShortsActionButtons) shortsScore += 30
        if (context.soundPivotCount > 0) shortsScore += 25

        // Normal player positive weights
        if (context.hasNormalWatchPlayer) normalPlayerScore += 60
        if (context.hasNormalVideoScrubber) normalPlayerScore += 45
        if (context.hasNormalVideoDescription) normalPlayerScore += 35
        if (context.hasVideoDurationText) normalPlayerScore += 30

        // Home feed positive weights
        if (context.hasHomeTabSelected) homeScore += 60
        if (context.hasSubscriptionsTabSelected) homeScore += 60
        if (context.hasHomeFeedList) homeScore += 40
        if (context.hasSearchBar) homeScore += 30

        // Strong overrides:
        // If a normal video player container is active, it cannot be Shorts
        if (context.hasNormalWatchPlayer || normalPlayerScore >= 50) {
            shortsScore = 0
        }

        // If Home or Subscriptions is active and there's no reel player/recycler, Shorts is 0
        if ((context.hasHomeTabSelected || context.hasSubscriptionsTabSelected) &&
            !context.hasReelRecycler && !context.hasReelWatchPlayer
        ) {
            shortsScore = 0
        }

        val isShorts = shortsScore >= CONFIDENCE_THRESHOLD && normalPlayerScore < 40

        val state = when {
            isShorts -> ScreenState.SHORTS_PLAYER
            context.hasNormalWatchPlayer || normalPlayerScore > homeScore -> ScreenState.NORMAL_VIDEO_PLAYER
            context.hasSubscriptionsTabSelected -> ScreenState.YOUTUBE_SUBSCRIPTIONS
            context.hasSearchBar -> ScreenState.YOUTUBE_SEARCH
            homeScore > 30 -> ScreenState.YOUTUBE_HOME
            else -> ScreenState.UNKNOWN
        }

        val details = "shortsScore=$shortsScore, normalScore=$normalPlayerScore, homeScore=$homeScore, " +
                "reelRecycler=${context.hasReelRecycler}, reelWatchPlayer=${context.hasReelWatchPlayer}, " +
                "shortsTab=${context.hasShortsTabSelected}, shortId=${context.currentShortIdentifier}"

        return DetectionResult(
            state = state,
            confidence = if (isShorts) shortsScore else maxOf(normalPlayerScore, homeScore),
            details = details,
            isShorts = isShorts
        )
    }

    private fun traverseNodes(node: AccessibilityNodeInfo?, ctx: InspectionContext, depth: Int) {
        if (node == null || depth > 40) return

        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val isSelected = node.isSelected

        // Bottom navigation checks
        if ((desc == "shorts" || text == "shorts") && isSelected) {
            ctx.hasShortsTabSelected = true
        }
        if ((desc == "home" || text == "home") && isSelected) {
            ctx.hasHomeTabSelected = true
        }
        if ((desc == "subscriptions" || text == "subscriptions") && isSelected) {
            ctx.hasSubscriptionsTabSelected = true
        }

        // Shorts-specific Reel Containers
        if (viewId.contains("reel_recycler")) {
            ctx.hasReelRecycler = true
            ctx.hasReelContainer = true
        }
        if (viewId.contains("reel_watch_player")) {
            ctx.hasReelWatchPlayer = true
            ctx.hasReelContainer = true
        }
        if (viewId.contains("reel_watch_fragment")) {
            ctx.hasReelWatchFragment = true
            ctx.hasReelContainer = true
        }
        if (viewId.contains("reel_player_page_container") ||
            viewId.contains("reel_player_overlay_container") ||
            viewId.contains("reel_player_overlay_root") ||
            viewId.contains("reel_player_footer_container")
        ) {
            ctx.hasReelPageContainer = true
            ctx.hasReelContainer = true
        }

        // Shorts vertical action buttons & sound pivot
        if (desc.contains("like this video along with") ||
            desc.contains("dislike this video") ||
            desc.contains("remix") ||
            desc.contains("use this sound") ||
            viewId.contains("reel_video_interactions")
        ) {
            ctx.hasShortsActionButtons = true
        }
        if (desc.contains("use this sound") || desc.contains("soundtrack")) {
            ctx.soundPivotCount++
        }

        // Extract identifier for unique Short counting (e.g. channel handle or title)
        if (desc.startsWith("go to channel") || desc.contains("like this video along with")) {
            if (ctx.currentShortIdentifier == null) {
                ctx.currentShortIdentifier = desc
            }
        }

        // Normal Video Player signatures (ensure reel_watch_player is NOT confused with watch_player)
        if ((viewId.contains("watch_player") && !viewId.contains("reel")) ||
            viewId.contains("player_fragment_container") ||
            (viewId.contains("player_view") && !viewId.contains("reel"))
        ) {
            ctx.hasNormalWatchPlayer = true
        }

        // Normal player scrubber (exclude reel_time_bar!)
        if (viewId.contains("watch_while_time_bar_view") ||
            (viewId.contains("time_bar") && !viewId.contains("reel_time_bar")) ||
            viewId.contains("player_control_play_pause") ||
            viewId.contains("fullscreen_button")
        ) {
            ctx.hasNormalVideoScrubber = true
        }

        // Normal video metadata / description / comments
        if (viewId.contains("video_metadata_layout") ||
            (viewId.contains("watch_panel") && !viewId.contains("reel")) ||
            (viewId.contains("watch_list") && !viewId.contains("reel")) ||
            viewId.contains("subscribe_button")
        ) {
            ctx.hasNormalVideoDescription = true
        }

        // Normal video duration format like "04:12 / 10:30"
        if (text.matches(Regex("""\d{1,2}:\d{2}\s*/\s*\d{1,2}:\d{2}"""))) {
            ctx.hasVideoDurationText = true
        }

        // Home feed signatures
        if (viewId.contains("tabs_bar") ||
            viewId.contains("youtube_logo") ||
            viewId.contains("feed_swipe_refresh_layout") ||
            viewId.contains("results_list")
        ) {
            ctx.hasHomeFeedList = true
        }

        // Search bar
        if (viewId.contains("search_edit_text") || viewId.contains("search_results")) {
            ctx.hasSearchBar = true
        }

        // Recurse children
        val childCount = node.childCount
        for (i in 0 until childCount) {
            val child = node.getChild(i)
            if (child != null) {
                traverseNodes(child, ctx, depth + 1)
                child.recycle()
            }
        }
    }
}
