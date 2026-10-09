# Audio transitions: phase one

Android now has an opt-in native crossfade. Enable it in Settings → transitions by choosing 2, 4, 6, 8, or 12 seconds. Off preserves normal queued playback. Settings are stored in Android preferences; no JavaScript timer drives audio.

## Playback lifecycle

1. The current ExoPlayer plays the authoritative queue. Near its end, a second player prepares the actual next item, including the existing shuffle permutation and repeat mode.
2. If both durations are known and the second player is ready, overlap starts. The media session and app follow the incoming player immediately; the original player becomes the outgoing tail.
3. Complementary S-shaped gain ramps blend the players. Their gains sum to one to avoid adding gain to correlated signals; this is not an equal-power fade or loudness normalization.
4. Completion releases the tail. The incoming player continues from its existing position; it is never restarted or sought at handoff.

Overlap is limited to half of either song's duration and must last at least one second. Repeat-one, a one-song queue, the end of a non-repeating queue, live/unknown-duration items, or an unready incoming player use normal playback. The last 750 ms is too late to start a new overlap. Preparation failures do not fade out the current song; normal player error handling remains responsible if a later queued file is unplayable.

## Ownership and interruptions

- `PlaybackService` owns the engine and MediaSession. React Native only sends commands and observes status.
- `CrossfadeEngine` owns at most two players. Native scheduling updates gains every 20 ms during a fade; progress follows playback position, not wall-clock time. This is not sample-accurate mixing.
- `PlaybackFocus` is the single focus owner. Neither deck requests competing focus. Transient focus loss pauses both decks; focus gain resumes when appropriate. Permanent loss and a user pause do not automatically resume.
- Pause and buffering freeze the tail and fade. Seeking, skipping, clearing/reordering the queue, changing shuffle/repeat, or changing the crossfade duration cancel the overlap and restore full gain to the current song.
- Headphone disconnection pauses both players. Local wake locks support background playback; players and timers are released with the service.
- Manual next/previous remains an immediate navigation action, not a request to start a fade.

## Validation

- JVM tests cover disabled/unknown/short durations, maximum duration, and bounded complementary gain curves.
- `CrossfadeEngineTest` uses real WAV decoders on Android. It covers continuous incoming position, pause/resume, seek/skip/clear, repeat-one/off, shuffle with repeat-all, queue changes, missing files, MediaController handoff, noisy-route pause, and transient audio-focus loss/recovery.
- JavaScript tests cover native setting confirmation, invalid durations, and failed setting updates without replacing the queue.
- Debug UI validation enabled six seconds in Settings, played local WAVs, sent the app to the background, and verified that the incoming song and overlap status were shown after returning.

Build only debug artifacts for ongoing development. Native changes require installing the new debug APK. Test with real headphones/Bluetooth and the user's OnePlus Nord CE3 before making claims about perceptual quality or device-specific interruptions; emulator timing checks do not establish those.

## Next phase

Add background decoding/analysis with cached loudness, silence, and candidate entry/exit points. Keep library scanning separate from expensive analysis; prioritize the current/next tracks and invalidate cached analysis when a file changes. Use confidence-based fallback to the crossfade implemented here. Beat grids, tempo matching, EQ/bass exchange, and a shared-clock C++ mixer are later capabilities, not currently implemented.
