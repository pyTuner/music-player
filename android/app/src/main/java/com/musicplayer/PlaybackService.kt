package com.musicplayer

import androidx.media3.common.AudioAttributes
import androidx.media3.common.Player
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class PlaybackService : MediaSessionService() {
  private var session: MediaSession? = null
  override fun onCreate() {
    super.onCreate()
    val modes = getSharedPreferences("playback_modes", MODE_PRIVATE)
    val player = ExoPlayer.Builder(this).build().apply {
      setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
      setHandleAudioBecomingNoisy(true)
      shuffleModeEnabled = modes.getBoolean("shuffle", false)
      repeatMode = modes.getInt("repeat", Player.REPEAT_MODE_OFF).takeIf { it in 0..2 } ?: Player.REPEAT_MODE_OFF
      addListener(object : Player.Listener {
        override fun onShuffleModeEnabledChanged(enabled: Boolean) {
          modes.edit().putBoolean("shuffle", enabled).apply()
        }
        override fun onRepeatModeChanged(mode: Int) {
          modes.edit().putInt("repeat", mode).apply()
        }
      })
    }
    session = MediaSession.Builder(this, player).build()
  }
  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session
  override fun onDestroy() {
    session?.run { player.release(); release() }
    session = null
    super.onDestroy()
  }
}
