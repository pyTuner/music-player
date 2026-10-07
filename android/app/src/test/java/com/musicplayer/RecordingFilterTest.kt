package com.musicplayer

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RecordingFilterTest {
  @Test fun excludesCommonRecorderFolders() {
    assertTrue(RecordingFilter.isRecording("Recordings/Call/", "123.m4a"))
    assertTrue(RecordingFilter.isRecording("MIUI/sound_recorder/call_rec/", "123.mp3"))
    assertTrue(RecordingFilter.isRecording("Sounds/Call Recordings/", "123.mp3"))
    assertTrue(RecordingFilter.isRecording("WhatsApp/Media/WhatsApp Voice Notes/", "PTT.ogg"))
  }
  @Test fun excludesRecorderFilePatternsOutsideKnownFolders() {
    assertTrue(RecordingFilter.isRecording("Download/", "Call_recording_20261007.m4a"))
    assertTrue(RecordingFilter.isRecording("Download/", "Recording_20261007.wav"))
    assertTrue(RecordingFilter.isRecording("Music/", "REC_20261007_1200.mp3"))
  }
  @Test fun preservesNormalMusicWithSimilarWordsAndShortSongs() {
    assertFalse(RecordingFilter.isRecording("Music/Live Recordings/", "Call Me Maybe.mp3"))
    assertFalse(RecordingFilter.isRecording("Music/", "Recordings of a Dream.mp3"))
    assertFalse(RecordingFilter.isRecording("Music/", "Intro.wav"))
  }
}
