package com.musicplayer

/** Pure transition rules, independent of the UI and the decoder. */
internal object CrossfadePolicy {
  const val MAX_SECONDS = 12
  // Fixed headroom whenever crossfade is enabled, including outside the overlap.
  // Equal-power gains can sum to sqrt(2); this keeps even aligned full-scale peaks bounded.
  const val MIX_HEADROOM = 0.70710677f
  fun outputGain(enabled: Boolean) = if (enabled) MIX_HEADROOM else 1f
  fun canStart(remainingMs: Long, intendedDurationMs: Long): Boolean =
    intendedDurationMs >= 1000 && remainingMs <= intendedDurationMs &&
      remainingMs >= maxOf(1000L, intendedDurationMs * 4 / 5)
  fun durationMs(requestedSeconds: Int, outgoingMs: Long, incomingMs: Long): Long {
    if (requestedSeconds <= 0 || outgoingMs <= 0 || incomingMs <= 0) return 0
    // Never consume most of a short track in a transition.
    return minOf(requestedSeconds.coerceAtMost(MAX_SECONDS) * 1000L, outgoingMs / 2, incomingMs / 2)
      .takeIf { it >= 1000 } ?: 0
  }
  fun gains(progress: Double): Pair<Float, Float> {
    val p = progress.coerceIn(0.0, 1.0)
    if (p == 0.0) return Pair(1f, 0f)
    if (p == 1.0) return Pair(0f, 1f)
    val angle = p * Math.PI / 2
    return Pair(kotlin.math.cos(angle).toFloat(), kotlin.math.sin(angle).toFloat())
  }
}
