package com.musicplayer

import org.junit.Assert.*
import org.junit.Test

class CrossfadePolicyTest {
  @Test fun disabledAndUnknownDurationsDoNotCrossfade() {
    assertEquals(0L, CrossfadePolicy.durationMs(0, 60000, 60000))
    assertEquals(0L, CrossfadePolicy.durationMs(6, -1, 60000))
    assertEquals(0L, CrossfadePolicy.durationMs(6, 60000, 0))
    assertEquals(0L, CrossfadePolicy.durationMs(6, 1500, 60000))
  }
  @Test fun shortSongsUseAtMostHalfTheirDuration() {
    assertEquals(6000L, CrossfadePolicy.durationMs(6, 60000, 60000))
    assertEquals(2500L, CrossfadePolicy.durationMs(6, 5000, 60000))
    assertEquals(2000L, CrossfadePolicy.durationMs(6, 60000, 4000))
    assertEquals(12000L, CrossfadePolicy.durationMs(99, 60000, 60000))
  }
  @Test fun gainsAreContinuousComplementaryAndNeverBoostTheMix() {
    assertEquals(Pair(1f, 0f), CrossfadePolicy.gains(-1.0))
    assertEquals(Pair(0f, 1f), CrossfadePolicy.gains(2.0))
    assertEquals(Pair(0.5f, 0.5f), CrossfadePolicy.gains(0.5))
    var previous = 0f
    for (i in 0..1000) {
      val (outgoing, incoming) = CrossfadePolicy.gains(i / 1000.0)
      assertTrue(incoming >= previous)
      assertEquals(1f, outgoing + incoming, 0.00001f)
      previous = incoming
    }
  }
}
