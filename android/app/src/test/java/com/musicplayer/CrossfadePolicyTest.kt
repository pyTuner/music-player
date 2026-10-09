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
  @Test fun gainsMaintainPowerForUncorrelatedSongsAndLeavePeakHeadroom() {
    assertEquals(Pair(1f, 0f), CrossfadePolicy.gains(-1.0))
    assertEquals(Pair(0f, 1f), CrossfadePolicy.gains(2.0))
    val middle = CrossfadePolicy.gains(0.5)
    assertEquals(kotlin.math.sqrt(0.5).toFloat(), middle.first, 0.00001f)
    assertEquals(middle.first, middle.second, 0.00001f)
    var previous = 0f
    for (i in 0..1000) {
      val (outgoing, incoming) = CrossfadePolicy.gains(i / 1000.0)
      assertTrue(incoming >= previous)
      assertEquals(1f, outgoing * outgoing + incoming * incoming, 0.00001f)
      assertTrue((outgoing + incoming) * CrossfadePolicy.MIX_HEADROOM <= 1.00001f)
      previous = incoming
    }
  }
  @Test fun aLateDecoderDoesNotSqueezeSixSecondsIntoASuddenFade() {
    assertFalse(CrossfadePolicy.canStart(900, 6000))
    assertFalse(CrossfadePolicy.canStart(3000, 6000))
    assertFalse(CrossfadePolicy.canStart(6100, 6000))
    assertFalse(CrossfadePolicy.canStart(0, 0))
    assertTrue(CrossfadePolicy.canStart(5900, 6000))
    assertTrue(CrossfadePolicy.canStart(1800, 2000))
  }
  @Test fun synthesizedDifferentFrequencyTonesKeepTheirRmsAcrossTheMix() {
    // Render three positions of two unrelated tones, including reserved headroom.
    // This catches the old 3 dB midpoint dip; it is a signal test, not a listening claim.
    fun rms(progress: Double): Double {
      val (a, b) = CrossfadePolicy.gains(progress)
      var energy = 0.0
      repeat(48000) { i ->
        val sample = CrossfadePolicy.MIX_HEADROOM * (
          a * kotlin.math.sin(2 * Math.PI * 220 * i / 48000) +
          b * kotlin.math.sin(2 * Math.PI * 330 * i / 48000))
        energy += sample * sample
      }
      return kotlin.math.sqrt(energy / 48000)
    }
    assertEquals(rms(0.0), rms(0.5), 0.00001)
    assertEquals(rms(0.0), rms(1.0), 0.00001)
  }
}
