package com.musicplayer

import org.junit.Assert.*
import org.junit.Test

class SharedAudioFilesTest {
  @Test fun recognizesDownloadsWithoutRelyingOnMusicMetadata() {
    assertTrue(SharedAudioFiles.isAudio("Downloaded song.MP3"))
    assertTrue(SharedAudioFiles.isAudio("track.m4a"))
    assertTrue(SharedAudioFiles.isAudio("track.flac"))
    assertFalse(SharedAudioFiles.isAudio("track.mp3.part"))
    assertFalse(SharedAudioFiles.isAudio(".hidden.mp3"))
    assertFalse(SharedAudioFiles.isAudio("cover.jpg"))
  }
}
