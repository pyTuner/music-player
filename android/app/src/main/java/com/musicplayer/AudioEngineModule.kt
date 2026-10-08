package com.musicplayer

import android.content.ComponentName
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.facebook.react.bridge.*
import com.google.common.util.concurrent.ListenableFuture
import com.musicplayer.specs.NativeAudioEngineSpec

class AudioEngineModule(private val context: ReactApplicationContext) : NativeAudioEngineSpec(context) {
  private val main = Handler(Looper.getMainLooper())
  private var connection: ListenableFuture<MediaController>? = null
  override fun getName() = "NativeAudioEngine"
  private fun withPlayer(promise: Promise, action: (MediaController) -> Any?) {
    main.post {
      try {
        val future = connection ?: MediaController.Builder(context,
          SessionToken(context, ComponentName(context, PlaybackService::class.java))).buildAsync().also { connection = it }
        future.addListener({
          try { promise.resolve(action(future.get())) }
          catch (error: Exception) { promise.reject("PLAYBACK_FAILED", error.message, error) }
        }, ContextCompat.getMainExecutor(context))
      } catch (error: Exception) { promise.reject("PLAYBACK_FAILED", error.message, error) }
    }
  }
  override fun setQueue(tracks: ReadableArray, index: Double, promise: Promise) = withPlayer(promise) { player ->
    val items = (0 until tracks.size()).map { position ->
      val track = requireNotNull(tracks.getMap(position))
      val uri = requireNotNull(track.getString("uri"))
      require(Uri.parse(uri).scheme in listOf("file", "content")) { "Only local audio is supported." }
      MediaItem.Builder().setMediaId(requireNotNull(track.getString("id"))).setUri(uri).build()
    }
    if (items.isEmpty()) { player.clearMediaItems() }
    else {
      require(index.toInt() in items.indices) { "Invalid queue position." }
      player.setMediaItems(items, index.toInt(), 0)
      player.prepare()
    }
    null
  }
  override fun removeQueueItem(id: String, promise: Promise) = withPlayer(promise) { player ->
    val index = (0 until player.mediaItemCount).firstOrNull { player.getMediaItemAt(it).mediaId == id }
    requireNotNull(index) { "Queue changed. Please try again." }
    player.removeMediaItem(index)
    null
  }
  override fun reorderQueue(ids: ReadableArray, promise: Promise) = withPlayer(promise) { player ->
    val requested = (0 until ids.size()).map { requireNotNull(ids.getString(it)) }
    val existing = (0 until player.mediaItemCount).map { player.getMediaItemAt(it).mediaId }
    require(requested.size == existing.size && requested.toSet().size == requested.size && requested.toSet() == existing.toSet()) {
      "Queue changed. Please try reordering again."
    }
    // Move existing MediaItems in place: preserve the active item, position and play state.
    requested.forEachIndexed { destination, id ->
      if (player.getMediaItemAt(destination).mediaId == id) return@forEachIndexed
      val source = (0 until player.mediaItemCount).first { player.getMediaItemAt(it).mediaId == id }
      if (source != destination) player.moveMediaItem(source, destination)
    }
    null
  }
  override fun play(promise: Promise) = withPlayer(promise) { it.play(); null }
  override fun pause(promise: Promise) = withPlayer(promise) { it.pause(); null }
  override fun next(promise: Promise) = withPlayer(promise) { it.seekToNextMediaItem(); null }
  override fun previous(promise: Promise) = withPlayer(promise) { player ->
    if (player.currentPosition > 5000 || !player.hasPreviousMediaItem()) player.seekTo(0)
    else player.seekToPreviousMediaItem()
    null
  }
  override fun seek(seconds: Double, promise: Promise) = withPlayer(promise) {
    require(seconds.isFinite() && seconds >= 0) { "Invalid seek position." }
    it.seekTo((seconds * 1000).toLong()); null
  }
  override fun getStatus(promise: Promise) = withPlayer(promise) { player ->
    Arguments.createMap().apply {
      putString("trackId", player.currentMediaItem?.mediaId ?: "")
      putBoolean("playing", player.isPlaying)
      putDouble("position", player.currentPosition.coerceAtLeast(0).toDouble() / 1000)
      putDouble("duration", player.duration.coerceAtLeast(0).toDouble() / 1000)
      putString("error", player.playerError?.message ?: "")
    }
  }
  override fun invalidate() {
    main.post { connection?.let { MediaController.releaseFuture(it) }; connection = null }
    super.invalidate()
  }
}
