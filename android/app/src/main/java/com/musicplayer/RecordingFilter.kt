package com.musicplayer

import java.util.Locale

/** Conservative fallback for OEMs that mark recorder output as music. Never inspect song titles. */
internal object RecordingFilter {
  private val folders = setOf("recordings", "recording", "recorder", "recorders", "call", "calls",
    "callrecordings", "callrecording", "callrecorder", "voicerecorder", "voicerecordings",
    "voicememos", "soundrecorder", "soundrecordings", "voice notes", "whatsapp voice notes")
  private val prefix = Regex("^(?:call[ _-]*(?:recording|record|rec)|voice[ _-]*(?:recording|memo)|recording[ _-]*[0-9]|rec[ _-]*[0-9]{6}|aud-[0-9]{8}-wa[0-9]+)", RegexOption.IGNORE_CASE)
  fun isRecording(path: String?, filename: String?): Boolean {
    val inRecorderFolder = path.orEmpty().replace('\\', '/').split('/').any {
      val normalized = it.lowercase(Locale.ROOT)
      normalized in folders || normalized.replace(Regex("[ _-]"), "") in folders
    }
    return inRecorderFolder || prefix.containsMatchIn(filename.orEmpty())
  }
}
