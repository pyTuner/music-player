package com.musicplayer

/** Pure transition rules, independent of the UI and the decoder. */
internal object CrossfadePolicy {
  const val MAX_SECONDS = 12
  fun durationMs(requestedSeconds: Int, outgoingMs: Long, incomingMs: Long): Long {
    if (requestedSeconds <= 0 || outgoingMs <= 0 || incomingMs <= 0) return 0
    // Never consume most of a short track in a transition.
    return minOf(requestedSeconds.coerceAtMost(MAX_SECONDS) * 1000L, outgoingMs / 2, incomingMs / 2)
      .takeIf { it >= 1000 } ?: 0
  }
  fun gains(progress: Double): Pair<Float, Float> {
    val p = progress.coerceIn(0.0, 1.0)
    val incoming = p * p * (3 - 2 * p)
    // Complementary S-curves: the combined gain never exceeds unity.
    return Pair((1 - incoming).toFloat(), incoming.toFloat())
  }
}
