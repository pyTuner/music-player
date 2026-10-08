package com.musicplayer

import java.util.Locale

internal object SharedAudioFiles {
  private val extensions = setOf("mp3", "m4a", "aac", "flac", "wav", "ogg", "opus", "oga", "amr", "aiff", "aif", "wma", "ape", "mp2", "mka", "3ga")
  fun isAudio(name: String) = !name.startsWith(".") &&
    name.substringAfterLast('.', "").lowercase(Locale.ROOT) in extensions
}
