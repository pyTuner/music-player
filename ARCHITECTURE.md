# Local music player: architecture and implementation audit

Reviewed against the full [architecture response in the shared conversation](https://chatgpt.com/share/6abfd625-e124-83ee-881c-794c83eb5051) on 2026-10-04.

## Product boundary

An offline music player in the existing React Native application. Keep the Windows Lumia visual language: black background, light oversized typography, cyan accent, flat surfaces and text pivots. Use original screen composition and wording rather than reproduce an existing player pixel for pixel. There is no server, login, cloud catalog, or music-streaming backend.

## Implemented flow

```text
React Navigation screens
  ├─ Library Zustand store → library service → NativeMusicLibrary
  │                                             ├─ Android MediaStore + document picker
  │                                             └─ iOS app audio directory + document picker
  ├─ SQLite repository ← metadata / favorites / saved queue
  └─ Player Zustand store → AudioEngine → NativeAudioEngine
                                             ├─ Android Media3 MediaSessionService
                                             └─ iOS AVFoundation player
```

The modules use TypeScript Codegen specifications in [specs](./specs), with registered Kotlin and Objective-C++ implementations. Audio files stay native; only metadata and playback status cross to JavaScript. React Navigation owns screen history. Audio lifetime is independent of mounted screens. A one-second foreground poll updates UI status; it never schedules audio or transitions. Native players advance the playback queue.

SQLite stores a normalized track table and small JSON preferences for favorites and queue restoration. Database work is asynchronous. Full scans replace track metadata inside a transaction only after successful discovery with permission. Scan errors retain the visible cache; denied permission hides inaccessible shared files without erasing their persisted metadata. Files are copied into app-owned audio storage on import, avoiding expiring document-provider URLs.

## Discovery behavior

- Android requests `READ_MEDIA_AUDIO` on API 33+, or `READ_EXTERNAL_STORAGE` on earlier supported versions. It scans all externally indexed audio, without an MP3-only or `IS_MUSIC` filter. The scan runs on a native worker at launch, on return to the app, and on manual rescan. Files outside MediaStore can be selected through the audio document picker. Private data of other apps is inaccessible.
- iOS imports audio through Files and rediscovers the app's audio directory on launch/foreground. Arbitrary filesystem scanning is not available. Apple Music-library access is not implemented; protected subscription audio is not a local DSP source.
- File support depends on platform decoders. Invalid/corrupt files can fail metadata extraction or playback. Partial multi-file imports may leave successfully copied files in the library; rescan recovers them.
- Imported audio is owned by the app. Uninstalling removes that audio and the local database. Rescanning does not delete source files.

Sources: [Android shared media](https://developer.android.com/training/data-storage/shared/media), [Apple document picker](https://developer.apple.com/documentation/uikit/uidocumentpickerviewcontroller/init(foropeningcontenttypes:ascopy:)), [React Native Turbo Modules](https://reactnative.dev/docs/turbo-native-modules-introduction).

## Audit against the chat

| Requirement | Current status |
| --- | --- |
| Bare React Native, TypeScript, New Architecture | Implemented in the existing app |
| Zustand state, React Navigation | Implemented |
| SQLite library persistence | Implemented; relational playlists/analysis migrations are future work |
| Device discovery and native file import | Implemented with platform-specific access boundaries |
| Play, pause, seek, previous/next, native queue advancement | Implemented |
| Mini-player, songs, artists, albums, favorites, queue, settings | Implemented |
| Background playback / audio focus / media session | Android Media3 service implemented; iOS interruptions and route changes pause playback, background/lock-screen integration remains pending |
| Home / recent listening history | Pending; collection is the current launch screen |
| User-created playlists and queue reordering | Pending; favorites and queue add/remove/clear are available |
| Separate NativeAudioAnalyzer | Pending; do not fabricate analysis results |
| Waveform, BPM, beat grid, energy, bass energy | Pending native analyzer and cache versioning |
| Skia waveform UI | Pending actual waveform output |
| Shared C++ DSP and two synchronized decks | Pending |
| Equal-power crossfade, beat alignment, bass swap | Pending; current playback is ordinary native queued playback |
| Pitch-preserving tempo matching, transition selection | Pending after two-deck mixing |
| Transition Lab | Pending usable analyzer and mixer |
| Backend / cloud / key matching | Deferred as in the discussion |

## Engineering choices and next steps

1. Keep file access separate from playback and analysis. File discovery was missing from the preview and must precede DSP work.
2. Use the platform playback stack for this milestone: Media3 on Android and AVPlayer on iOS. The iOS AVAudioEngine/player-node mixer described in the chat is still required for synchronized two-deck DSP; this adapter is not that mixer.
3. Next introduce a separate native analyzer with cancellation, bounded worker concurrency, stable file identity, analysis versioning, and confidence scores. Never infer a reliable beat grid from BPM alone. Use simple crossfade fallback for low-confidence or incompatible tracks.
4. Develop the shared C++ mixer on a single audio clock. Independent player starts and JavaScript timers are not suitable for beat alignment. Add headroom/limiting and listening tests before claiming seamless transitions.
5. Add relational playlists, history, resumable playback position, incremental media-change observation, embedded artwork, and library paging as the collection grows.
6. Test permissions, SD-card removal, unsupported files, app restarts, calls, headphones, background playback, and queue completion on actual devices. Build success does not prove audio behavior.

## Verification

- TypeScript and ESLint checks.
- Store tests: granted/denied discovery, failed scan retention, import refresh, favorites persistence, queue commands, seek preservation, and native failure reporting.
- Android Codegen and Kotlin compilation.
- Native build/device verification is reported separately in the session; do not infer it from the presence of implementation files.
