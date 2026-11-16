package com.reclaim.detection

enum class ScreenState {
    YOUTUBE_HOME,
    NORMAL_VIDEO_PLAYER,
    YOUTUBE_SEARCH,
    YOUTUBE_SUBSCRIPTIONS,
    SHORTS_PLAYER,
    UNKNOWN
}

data class DetectionResult(
    val state: ScreenState,
    val confidence: Int,
    val details: String,
    val isShorts: Boolean
)

