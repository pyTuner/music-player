package com.musicplayer

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaController
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Real decoders and native audio clocks: mocks cannot prove a two-deck handoff. */
class CrossfadeEngineTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private val context get() = instrumentation.targetContext
  private lateinit var engine: CrossfadeEngine
  private lateinit var tracks: List<MediaItem>
  private var session: MediaSession? = null
  private var controller: MediaController? = null
  private var savedSeconds = 0
  private var savedShuffle = false
  private var savedRepeat = 0
  private fun <T> main(block: () -> T): T {
    var result: Result<T>? = null
    instrumentation.runOnMainSync { result = runCatching(block) }
    return requireNotNull(result).getOrThrow()
  }
  private fun await(message: String, timeout: Long = 6000, condition: () -> Boolean) {
    val end = android.os.SystemClock.elapsedRealtime() + timeout
    while (android.os.SystemClock.elapsedRealtime() < end) {
      if (main(condition)) return
      Thread.sleep(40)
    }
    fail(message)
  }
  @Before fun setup() {
    // Audio focus on Android 15+ requires the app to be in the foreground (or a media FGS).
    instrumentation.startActivitySync(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    tracks = (0..3).map { index ->
      val file = File(context.cacheDir, "crossfade-test-$index.wav")
      val rate = 16000
      val count = rate * 8
      val wav = ByteBuffer.allocate(44 + count * 2).order(ByteOrder.LITTLE_ENDIAN)
      wav.put("RIFF".toByteArray()).putInt(36 + count * 2).put("WAVEfmt ".toByteArray())
      wav.putInt(16).putShort(1).putShort(1).putInt(rate).putInt(rate * 2).putShort(2).putShort(16)
      wav.put("data".toByteArray()).putInt(count * 2)
      repeat(count) { sample -> wav.putShort((kotlin.math.sin(sample * 2.0 * Math.PI * (220 + index * 110) / rate) * 1500).toInt().toShort()) }
      file.writeBytes(wav.array())
      MediaItem.Builder().setMediaId("test-$index").setUri(Uri.fromFile(file)).build()
    }
    main {
      val settings = context.getSharedPreferences("transitions", Context.MODE_PRIVATE)
      val modes = context.getSharedPreferences("playback_modes", Context.MODE_PRIVATE)
      savedSeconds = settings.getInt("crossfadeSeconds", 0)
      savedShuffle = modes.getBoolean("shuffle", false)
      savedRepeat = modes.getInt("repeat", 0)
      settings.edit().putInt("crossfadeSeconds", 4).commit()
      modes.edit().putBoolean("shuffle", false).putInt("repeat", 0).commit()
      engine = CrossfadeEngine(context, { session?.setPlayer(it) }, {})
      session = MediaSession.Builder(context, engine.player).setId("crossfade-test").build()
      engine.player.setMediaItems(tracks, 0, 0)
      engine.player.prepare()
      engine.player.play()
    }
    await("Playback did not start") { engine.player.isPlaying }
  }
  @After fun teardown() {
    main {
      controller?.release()
      session?.release()
      session = null
      if (::engine.isInitialized) engine.release()
      context.getSharedPreferences("transitions", Context.MODE_PRIVATE).edit().putInt("crossfadeSeconds", savedSeconds).commit()
      context.getSharedPreferences("playback_modes", Context.MODE_PRIVATE).edit().putBoolean("shuffle", savedShuffle).putInt("repeat", savedRepeat).commit()
    }
    (0..3).forEach { File(context.cacheDir, "crossfade-test-$it.wav").delete() }
  }
  private fun overlap(): Player {
    val outgoing = main { engine.player.also { it.seekTo(3300) } }
    await("Next deck did not crossfade") { engine.isCrossfading }
    return outgoing
  }
  @Test fun handoffKeepsIncomingPositionAndComplementaryVolumes() {
    val tail = overlap()
    await("Incoming deck did not progress") { engine.player.currentPosition > 500 }
    main {
      assertEquals("test-1", engine.player.currentMediaItem?.mediaId)
      assertTrue(tail.isPlaying)
      assertEquals(1f, tail.volume + engine.player.volume, 0.01f)
    }
    await("Fade did not complete") { !engine.isCrossfading }
    main {
      assertEquals("test-1", engine.player.currentMediaItem?.mediaId)
      assertTrue(engine.player.currentPosition >= 3500)
      assertEquals(1f, engine.player.volume, 0.001f)
    }
  }
  @Test fun pauseFreezesBothDecksAndResumeContinuesTheFade() {
    val tail = overlap()
    await("Fade did not progress") { engine.player.currentPosition > 300 }
    main { engine.player.pause() }
    Thread.sleep(100)
    val positions = main { Pair(engine.player.currentPosition, tail.currentPosition) }
    val gain = main { engine.player.volume }
    Thread.sleep(350)
    main {
      assertFalse(engine.player.isPlaying)
      assertFalse(tail.isPlaying)
      assertTrue(kotlin.math.abs(engine.player.currentPosition - positions.first) < 80)
      assertTrue(kotlin.math.abs(tail.currentPosition - positions.second) < 80)
      assertEquals(gain, engine.player.volume, 0.001f)
      engine.player.play()
    }
    await("Resume did not complete fade") { !engine.isCrossfading }
  }
  @Test fun seekSkipAndQueueClearCancelTheOldDeck() {
    overlap()
    main { engine.player.seekTo(1000) }
    await("Seek left a tail playing") { !engine.isCrossfading && engine.player.volume == 1f }
    overlap()
    main { engine.player.seekToNextMediaItem() }
    await("Skip left a tail playing") { !engine.isCrossfading && engine.player.volume == 1f }
    main { engine.player.setMediaItems(tracks, 0, 3300); engine.player.prepare(); engine.player.play() }
    await("Queue reset did not fade") { engine.isCrossfading }
    main { engine.player.clearMediaItems() }
    await("Clear left a tail playing") { !engine.isCrossfading && engine.player.mediaItemCount == 0 }
  }
  @Test fun repeatOneAndDisabledModeNeverOverlap() {
    main { engine.player.repeatMode = Player.REPEAT_MODE_ONE; engine.player.seekTo(6500) }
    Thread.sleep(2000)
    main {
      assertFalse(engine.isCrossfading)
      assertEquals("test-0", engine.player.currentMediaItem?.mediaId)
      context.getSharedPreferences("transitions", Context.MODE_PRIVATE).edit().putInt("crossfadeSeconds", 0).commit()
      engine.player.repeatMode = Player.REPEAT_MODE_OFF
      engine.player.seekTo(6500)
    }
    await("Normal queue did not advance") { engine.player.currentMediaItem?.mediaId == "test-1" }
    main { assertFalse(engine.isCrossfading); assertEquals(1f, engine.player.volume, 0.001f) }
  }
  @Test fun shuffleAndRepeatAllUseTheActualNextItem() {
    main { engine.player.shuffleModeEnabled = true; engine.player.repeatMode = Player.REPEAT_MODE_ALL }
    val expected = main { engine.player.getMediaItemAt(engine.player.nextMediaItemIndex).mediaId }
    overlap()
    main { assertEquals(expected, engine.player.currentMediaItem?.mediaId) }
  }
  @Test fun queueEditInvalidatesThePreloadedSong() {
    main { engine.player.seekTo(1000) }
    Thread.sleep(250)
    main { engine.player.removeMediaItem(1) }
    overlap()
    main { assertEquals("test-2", engine.player.currentMediaItem?.mediaId) }
  }
  @Test fun mediaControllerFollowsHandoffAndPausesBothDecks() {
    val future = main { MediaController.Builder(context, requireNotNull(session).token).buildAsync() }
    controller = future.get(5, java.util.concurrent.TimeUnit.SECONDS)
    val tail = overlap()
    await("Controller did not follow the incoming song") { controller?.currentMediaItem?.mediaId == "test-1" }
    main { controller?.pause() }
    await("Session pause did not reach both decks") { !engine.player.isPlaying && !tail.isPlaying }
    main { controller?.play() }
    await("Session play did not resume both decks") { engine.player.isPlaying && tail.isPlaying }
  }
  @Test fun noisyRoutePausesBothDecksAndTurningOffCrossfadeStopsTheTail() {
    val tail = overlap()
    main { engine.pauseForNoisyRoute() }
    await("Route change left audio playing") { !engine.player.isPlaying && !tail.isPlaying }
    main { context.getSharedPreferences("transitions", Context.MODE_PRIVATE).edit().putInt("crossfadeSeconds", 0).commit() }
    await("Disabling crossfade left a second deck") { !engine.isCrossfading && engine.player.volume == 1f }
  }
  @Test fun transientAudioFocusLossPausesBothDecksAndGainResumes() {
    val tail = overlap()
    val manager = context.getSystemService(android.media.AudioManager::class.java)
    val request = android.media.AudioFocusRequest.Builder(android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
      .setAudioAttributes(android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_MEDIA).build())
      .setOnAudioFocusChangeListener({}, android.os.Handler(android.os.Looper.getMainLooper())).build()
    try {
      assertEquals(android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED, main { manager.requestAudioFocus(request) })
      await("Focus loss left audio playing") { !engine.player.isPlaying && !tail.isPlaying }
    } finally { main { manager.abandonAudioFocusRequest(request) } }
    await("Focus gain did not resume both decks") { engine.player.isPlaying && tail.isPlaying }
  }
  @Test fun missingNextFileFallsBackToNormalCurrentPlayback() {
    main {
      engine.player.setMediaItems(listOf(tracks[0], MediaItem.Builder().setMediaId("missing").setUri(Uri.fromFile(File(context.cacheDir, "absent.wav"))).build()), 0, 3300)
      engine.player.prepare(); engine.player.play()
    }
    Thread.sleep(2000)
    main {
      assertFalse(engine.isCrossfading)
      assertEquals("test-0", engine.player.currentMediaItem?.mediaId)
      assertEquals(1f, engine.player.volume, 0.001f)
    }
  }
}
