package com.musicplayer

import android.app.Activity
import android.content.ContentUris
import android.content.Intent
import android.media.MediaMetadataRetriever
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.os.storage.StorageManager
import android.net.Uri
import android.provider.MediaStore
import android.provider.OpenableColumns
import com.facebook.react.bridge.*
import com.musicplayer.specs.NativeMusicLibrarySpec
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class MusicLibraryModule(private val context: ReactApplicationContext) : NativeMusicLibrarySpec(context) {
  private val worker = Executors.newSingleThreadExecutor()
  private var pickerPromise: Promise? = null
  private val requestCode = 7031
  private val listener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, request: Int, result: Int, data: Intent?) {
      if (request != requestCode) return
      val promise = pickerPromise ?: return
      pickerPromise = null
      if (result != Activity.RESULT_OK || data == null) { promise.resolve(Arguments.createArray()); return }
      val uris = mutableListOf<Uri>()
      data.clipData?.let { clips -> for (i in 0 until clips.itemCount) uris.add(clips.getItemAt(i).uri) }
      if (uris.isEmpty()) data.data?.let { uris.add(it) }
      worker.execute {
        try {
          val imported = Arguments.createArray()
          for (uri in uris) {
            var name = "audio"
            context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
              if (it.moveToFirst()) name = it.getString(0) ?: name
            }
            val file = File(importDirectory(), "${UUID.randomUUID()}_${File(name).name}")
            try {
              context.contentResolver.openInputStream(uri)?.use { input -> file.outputStream().use { input.copyTo(it) } }
                ?: throw IllegalStateException("Cannot read $name")
              imported.pushMap(readFile(file))
            } catch (error: Exception) {
              file.delete()
              throw error
            }
          }
          promise.resolve(imported)
        } catch (error: Exception) { promise.reject("IMPORT_FAILED", error.message, error) }
      }
    }
  }
  init { context.addActivityEventListener(listener) }
  override fun getName() = "NativeMusicLibrary"
  private fun importDirectory() = File(context.filesDir, "audio").apply { mkdirs() }
  private val indexedFiles = mutableMapOf<String, Pair<Long, Long>>()

  // Refresh copied/downloaded files before querying MediaStore. A query alone
  // cannot discover audio that the system scanner has not indexed yet.
  private fun refreshSharedAudio() {
    val roots = if (Build.VERSION.SDK_INT >= 30) {
      context.getSystemService(StorageManager::class.java).storageVolumes.mapNotNull { it.directory }
    } else listOf(Environment.getExternalStorageDirectory())
    val files = roots.distinctBy { it.absolutePath }.flatMap { root ->
      root.walkTopDown().onEnter { directory ->
        directory == root || (!directory.name.startsWith(".") &&
          directory.name != "Android" && !File(directory, ".nomedia").exists())
      }.filter { file ->
        file.isFile && file.canRead() && SharedAudioFiles.isAudio(file.name) &&
          indexedFiles[file.absolutePath] != Pair(file.lastModified(), file.length())
      }.toList()
    }
    if (files.isEmpty()) return
    val stamps = files.associate { it.absolutePath to Pair(it.lastModified(), it.length()) }
    val completed = java.util.concurrent.ConcurrentHashMap<String, Pair<Long, Long>>()
    val pending = CountDownLatch(files.size)
    MediaScannerConnection.scanFile(context, files.map { it.absolutePath }.toTypedArray(), null) { path, uri ->
      if (uri != null) stamps[path]?.let { completed[path] = it }
      pending.countDown()
    }
    val finished = pending.await(45, TimeUnit.SECONDS)
    indexedFiles.putAll(completed)
    check(finished) { "Android is still indexing your audio. Please scan again shortly." }
  }

  override fun scan(includeRecordings: Boolean, promise: Promise) {
    worker.execute {
      try {
        val result = Arguments.createArray()
        val permission = if (android.os.Build.VERSION.SDK_INT >= 33) "android.permission.READ_MEDIA_AUDIO" else "android.permission.READ_EXTERNAL_STORAGE"
        if (context.checkSelfPermission(permission) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
          refreshSharedAudio()
          val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
          val pathColumn = if (android.os.Build.VERSION.SDK_INT >= 29) MediaStore.Audio.Media.RELATIVE_PATH else MediaStore.Audio.Media.DATA
          val columns = arrayOf(MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE, MediaStore.Audio.Media.ARTIST, MediaStore.Audio.Media.ALBUM, MediaStore.Audio.Media.DURATION, pathColumn, MediaStore.Audio.Media.DISPLAY_NAME)
          val selection = if (includeRecordings) null else buildString {
            append("${MediaStore.Audio.Media.IS_RINGTONE} = 0 AND ${MediaStore.Audio.Media.IS_NOTIFICATION} = 0 AND ${MediaStore.Audio.Media.IS_ALARM} = 0")
            if (android.os.Build.VERSION.SDK_INT >= 31) append(" AND ${MediaStore.Audio.Media.IS_RECORDING} = 0")
          }
          context.contentResolver.query(collection, columns, selection, null, "${MediaStore.Audio.Media.TITLE} ASC")?.use { cursor ->
            while (cursor.moveToNext()) {
              if (!includeRecordings && RecordingFilter.isRecording(cursor.getString(5), cursor.getString(6))) continue
              val uri = ContentUris.withAppendedId(collection, cursor.getLong(0)).toString()
              result.pushMap(Arguments.createMap().apply {
                putString("id", uri); putString("uri", uri)
                putString("title", cursor.getString(1) ?: "Untitled audio")
                putString("artist", clean(cursor.getString(2), "Unknown artist"))
                putString("album", clean(cursor.getString(3), "Unknown album"))
                putDouble("duration", cursor.getLong(4).toDouble() / 1000)
              })
            }
          }
        }
        importDirectory().listFiles()?.filter { it.isFile }?.forEach { file ->
          try { result.pushMap(readFile(file)) } catch (_: Exception) { /* Leave an unreadable file on disk; skip its metadata. */ }
        }
        promise.resolve(result)
      } catch (error: Exception) { promise.reject("SCAN_FAILED", error.message, error) }
    }
  }
  private fun clean(value: String?, fallback: String) = if (value.isNullOrBlank() || value == "<unknown>") fallback else value
  private fun readFile(file: File): WritableMap {
    val metadata = MediaMetadataRetriever()
    try {
      metadata.setDataSource(file.absolutePath)
      return Arguments.createMap().apply {
        putString("id", "import:${file.name}")
        putString("uri", Uri.fromFile(file).toString())
        putString("title", metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE) ?: file.name.substringAfter('_').substringBeforeLast('.'))
        putString("artist", clean(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST), "Unknown artist"))
        putString("album", clean(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM), "Imported audio"))
        putDouble("duration", (metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toDoubleOrNull() ?: 0.0) / 1000)
      }
    } finally { metadata.release() }
  }
  override fun importFiles(promise: Promise) {
    val activity = context.currentActivity
    if (activity == null) { promise.reject("NO_ACTIVITY", "Open the app before importing files."); return }
    activity.runOnUiThread {
      if (pickerPromise != null) { promise.reject("BUSY", "A file picker is already open."); return@runOnUiThread }
      pickerPromise = promise
      try {
        activity.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
          type = "audio/*"; addCategory(Intent.CATEGORY_OPENABLE)
          putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        }, requestCode)
      } catch (error: Exception) { pickerPromise = null; promise.reject("PICKER_FAILED", error.message, error) }
    }
  }
  override fun invalidate() {
    context.removeActivityEventListener(listener)
    pickerPromise?.reject("CANCELLED", "Library closed.")
    pickerPromise = null
    worker.shutdown()
    super.invalidate()
  }
}
