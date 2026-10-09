package com.musicplayer

import android.content.Context
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import androidx.media3.common.*
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ShuffleOrder

/** Two local-audio decks. All decisions and gain updates run on the native main looper.
 * MediaSession follows the incoming deck at fade start; the outgoing deck is retired at fade end.
 * This is overlap/crossfade, not beat matching or sample-accurate DSP.
 */
internal class CrossfadeEngine(
  private val context: Context,
  private val onPlayerChanged: (Player) -> Unit,
  private val onTransitionChanged: (Boolean) -> Unit,
) {
  private val handler = Handler(Looper.getMainLooper())
  private val modes = context.getSharedPreferences("playback_modes", Context.MODE_PRIVATE)
  private val settings = context.getSharedPreferences("transitions", Context.MODE_PRIVATE)
  private var closed = false
  private var changing = false
  private var resumeAfterFocus = false
  private val focus = PlaybackFocus(context, ::focusChanged)
  private var active = createDeck()
  private var standby: ExoPlayer? = null
  private var outgoing: ExoPlayer? = null
  private var standbyIndex = C.INDEX_UNSET
  private var failedCandidate: String? = null
  private var fadeDuration = 0L
  private var fadeStart = 0L
  private var previousProgress = 0.0
  var seconds = settings.getInt("crossfadeSeconds", 0).coerceIn(0, CrossfadePolicy.MAX_SECONDS)
    private set
  val isCrossfading: Boolean get() = outgoing != null
  var player: Player = controls(active)
    private set

  private val listener = object : Player.Listener {
    override fun onPlayWhenReadyChanged(ready: Boolean, reason: Int) {
      if (changing) return
      if (!ready) outgoing?.pause()
      synchronizeTail()
    }
    override fun onIsPlayingChanged(playing: Boolean) { if (!changing) synchronizeTail() }
    override fun onMediaItemTransition(item: MediaItem?, reason: Int) {
      if (!changing) { cancelOverlap(); discardStandby(); failedCandidate = null }
    }
    override fun onPositionDiscontinuity(old: Player.PositionInfo, new: Player.PositionInfo, reason: Int) {
      if (!changing && reason != Player.DISCONTINUITY_REASON_AUTO_TRANSITION) {
        cancelOverlap(); discardStandby(); failedCandidate = null
      }
    }
    override fun onTimelineChanged(timeline: Timeline, reason: Int) {
      if (!changing && reason == Player.TIMELINE_CHANGE_REASON_PLAYLIST_CHANGED) {
        cancelOverlap(); discardStandby(); failedCandidate = null
      }
    }
    override fun onShuffleModeEnabledChanged(enabled: Boolean) {
      modes.edit().putBoolean("shuffle", enabled).apply()
      if (!changing) { cancelOverlap(); discardStandby(); failedCandidate = null }
    }
    override fun onRepeatModeChanged(mode: Int) {
      modes.edit().putInt("repeat", mode).apply()
      if (!changing) { cancelOverlap(); discardStandby(); failedCandidate = null }
    }
    override fun onPlaybackParametersChanged(parameters: PlaybackParameters) {
      if (!changing) { cancelOverlap(); discardStandby() }
    }
    override fun onPlayerError(error: PlaybackException) {
      cancelOverlap(); discardStandby()
    }
    override fun onPlaybackStateChanged(state: Int) {
      if (!changing && (state == Player.STATE_IDLE || state == Player.STATE_ENDED)) {
        cancelOverlap(); discardStandby(); focus.release()
      }
    }
  }
  private val settingsListener = android.content.SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
    if (key == "crossfadeSeconds") {
      seconds = settings.getInt(key, 0).coerceIn(0, CrossfadePolicy.MAX_SECONDS)
      cancelOverlap(); discardStandby(); failedCandidate = null
    }
  }
  private val tick = object : Runnable {
    override fun run() {
      if (closed) return
      update()
      handler.postDelayed(this, if (isCrossfading) 20L else if (active.isPlaying) 100L else 500L)
    }
  }
  init {
    active.shuffleModeEnabled = modes.getBoolean("shuffle", false)
    active.repeatMode = modes.getInt("repeat", Player.REPEAT_MODE_OFF).coerceIn(0, 2)
    active.addListener(listener)
    settings.registerOnSharedPreferenceChangeListener(settingsListener)
    handler.post(tick)
  }
  private fun createDeck() = ExoPlayer.Builder(context).build().apply {
    setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA)
      .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), false)
    setWakeMode(C.WAKE_MODE_LOCAL)
    volume = 1f
  }
  private fun controls(deck: ExoPlayer): Player = object : ForwardingPlayer(deck) {
    override fun play() = setPlayWhenReady(true)
    override fun pause() = setPlayWhenReady(false)
    override fun setPlayWhenReady(ready: Boolean) {
      if (deck !== active) return
      resumeAfterFocus = false
      if (!ready || focus.acquire()) {
        deck.playWhenReady = ready
        if (!ready) { outgoing?.pause(); focus.release() }
      }
    }
    override fun stop() {
      resumeAfterFocus = false
      cancelOverlap(); discardStandby(); deck.stop(); focus.release()
    }
  }
  private fun focusChanged(change: Int) {
    when (change) {
      AudioManager.AUDIOFOCUS_GAIN -> {
        if (resumeAfterFocus) { resumeAfterFocus = false; active.play() }
      }
      AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
        val permanent = change == AudioManager.AUDIOFOCUS_LOSS
        resumeAfterFocus = !permanent && (active.playWhenReady || resumeAfterFocus)
        focus.lost(permanent)
        active.pause(); outgoing?.pause()
      }
    }
  }
  fun pauseForNoisyRoute() { player.pause() }
  private fun synchronizeTail() { outgoing?.playWhenReady = active.isPlaying }

  private fun update() {
    val tail = outgoing
    if (tail != null) {
      synchronizeTail()
      if (!active.isPlaying) return
      // Progress follows decoded playback, so a pause/buffer wait freezes the envelope.
      val p = ((active.currentPosition - fadeStart).toDouble() / fadeDuration).coerceIn(previousProgress, 1.0)
      previousProgress = p
      if (p >= 1 || tail.playbackState == Player.STATE_ENDED || tail.playerError != null) {
        cancelOverlap()
      } else {
        val gains = CrossfadePolicy.gains(p)
        tail.volume = gains.first
        active.volume = gains.second
      }
      return
    }
    if (seconds == 0 || active.repeatMode == Player.REPEAT_MODE_ONE || !active.isPlaying ||
      active.isCurrentMediaItemLive || active.duration <= 0) return
    val next = active.nextMediaItemIndex
    if (next == C.INDEX_UNSET || next == active.currentMediaItemIndex) { discardStandby(); return }
    val candidate = active.getMediaItemAt(next).mediaId
    if (candidate == failedCandidate) return
    val remaining = active.duration - active.currentPosition
    if (remaining > seconds * 1000L + 8000) return
    if (standby == null || standbyIndex != next) preload(next)
    val prepared = standby ?: return
    if (prepared.playerError != null) {
      failedCandidate = candidate; discardStandby(); return
    }
    if (prepared.playbackState != Player.STATE_READY) return
    val duration = CrossfadePolicy.durationMs(seconds, active.duration, prepared.duration)
    // Too late to overlap cleanly? Leave the existing queue to advance normally.
    if (duration == 0L || remaining > duration || remaining < 750) return
    beginOverlap(prepared, remaining.coerceAtMost(duration))
  }
  private fun preload(next: Int) {
    discardStandby()
    val prepared = createDeck()
    standby = prepared
    standbyIndex = next
    prepared.volume = 0f
    prepared.setMediaItems((0 until active.mediaItemCount).map(active::getMediaItemAt), next, 0)
    // Copy the real shuffle permutation rather than generating a different next song.
    val timeline = active.currentTimeline
    val order = mutableListOf<Int>()
    var index = timeline.getFirstWindowIndex(true)
    while (index != C.INDEX_UNSET && order.size < active.mediaItemCount) {
      order.add(index)
      index = timeline.getNextWindowIndex(index, Player.REPEAT_MODE_OFF, true)
    }
    if (order.size == active.mediaItemCount) prepared.setShuffleOrder(ShuffleOrder.DefaultShuffleOrder(order.toIntArray(), 0L))
    prepared.shuffleModeEnabled = active.shuffleModeEnabled
    prepared.repeatMode = active.repeatMode
    prepared.playbackParameters = active.playbackParameters
    prepared.prepare()
  }
  private fun beginOverlap(prepared: ExoPlayer, duration: Long) {
    changing = true
    val tail = active
    tail.removeListener(listener)
    // Prevent the old deck from advancing into a second copy of the incoming song.
    tail.pauseAtEndOfMediaItems = true
    outgoing = tail
    standby = null
    standbyIndex = C.INDEX_UNSET
    active = prepared
    fadeDuration = duration
    fadeStart = prepared.currentPosition
    previousProgress = 0.0
    failedCandidate = null
    active.addListener(listener)
    player = controls(active)
    onPlayerChanged(player)
    active.play()
    changing = false
    synchronizeTail()
    onTransitionChanged(true)
  }
  private fun cancelOverlap() {
    val tail = outgoing ?: return
    outgoing = null
    tail.release()
    active.volume = 1f
    previousProgress = 0.0
    onTransitionChanged(false)
  }
  private fun discardStandby() {
    standby?.release(); standby = null; standbyIndex = C.INDEX_UNSET
  }
  fun release() {
    closed = true
    handler.removeCallbacks(tick)
    settings.unregisterOnSharedPreferenceChangeListener(settingsListener)
    active.removeListener(listener)
    cancelOverlap(); discardStandby(); active.release(); focus.release()
  }
}
