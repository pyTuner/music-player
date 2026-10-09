package com.musicplayer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.Bundle
import androidx.core.content.ContextCompat
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class PlaybackService : MediaSessionService() {
  private var session: MediaSession? = null
  private lateinit var engine: CrossfadeEngine
  private val noisy = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) engine.pauseForNoisyRoute()
    }
  }
  override fun onCreate() {
    super.onCreate()
    engine = CrossfadeEngine(this,
      onPlayerChanged = { session?.setPlayer(it) },
      onTransitionChanged = { mixing -> session?.setSessionExtras(Bundle().apply { putBoolean("crossfading", mixing) }) })
    session = MediaSession.Builder(this, engine.player).build()
    ContextCompat.registerReceiver(this, noisy, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY), ContextCompat.RECEIVER_EXPORTED)
  }
  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session
  override fun onDestroy() {
    unregisterReceiver(noisy)
    session?.release()
    session = null
    engine.release()
    super.onDestroy()
  }
}
