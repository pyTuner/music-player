package com.musicplayer

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper

/** One audio-focus owner for both decks; neither ExoPlayer requests competing focus. */
internal class PlaybackFocus(context: Context, private val changed: (Int) -> Unit) {
  private val manager = context.getSystemService(AudioManager::class.java)
  private val listener = AudioManager.OnAudioFocusChangeListener(changed)
  private var held = false
  private val request = if (Build.VERSION.SDK_INT >= 26) AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
    .setOnAudioFocusChangeListener(listener, Handler(Looper.getMainLooper()))
    .setWillPauseWhenDucked(true).build() else null

  @Suppress("DEPRECATION")
  fun acquire(): Boolean {
    if (held) return true
    val result = if (Build.VERSION.SDK_INT >= 26) manager.requestAudioFocus(requireNotNull(request))
      else manager.requestAudioFocus(listener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
    held = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    return held
  }
  fun lost(permanent: Boolean) { if (permanent) held = false }
  @Suppress("DEPRECATION")
  fun release() {
    if (Build.VERSION.SDK_INT >= 26) manager.abandonAudioFocusRequest(requireNotNull(request))
    else manager.abandonAudioFocus(listener)
    held = false
  }
}
