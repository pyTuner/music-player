# Music player direction

Source: [shared project discussion](https://chatgpt.com/share/6abfd625-e124-83ee-881c-794c83eb5051), reviewed on 2026-10-02.

## Strict design requirement

The user requires the Windows Lumia music player theme throughout the app. Preserve this identity in every screen and future feature.

Working interpretation of the Lumia / Metro design language:

- Black backgrounds, white primary text, muted secondary text, and one consistent accent color.
- Large, lightweight, left-aligned typography with generous spacing and clear hierarchy.
- Panorama/pivot-style text navigation for music categories such as songs, albums, artists, and playlists.
- Flat, square artwork and tiles; minimal decoration and simple outlined playback controls.
- Consistent styling across library, now playing, queue, settings, empty states, and dialogs.
- Preserve accessible contrast, readable font scaling, safe areas, and usable touch targets.

The exact Lumia-era reference and accent color have not been specified. These visual defaults are an interpretation, not additional user-selected requirements. Avoid drifting toward rounded card dashboards, glass effects, gradients, or a generic streaming-service appearance.

## Product and architecture direction from the chat

Build an offline-first local music player, incrementally, with an eventual native transition engine.

- Bare React Native / Community CLI, TypeScript, and the New Architecture.
- Zustand for application state; SQLite for persistent library metadata and analysis.
- React Navigation for navigation; Skia for waveform visualization when needed.
- Separate playback and analysis behind typed Turbo Native Modules with Codegen.
- Native/C++ handles DSP, analysis, mixing, and audio-timeline scheduling. JavaScript handles UI, configuration, and orchestration.
- iOS direction: AVAudioEngine / AVAudioPlayerNode. Android direction: Media3 with native audio processing; validate a shared-clock mixing path for synchronized decks rather than assuming two independent players provide precise synchronization.
- Native background analysis returns compact waveform, BPM, beat, energy, and bass-energy metadata. Cache results with file identity and analysis version.
- Keep audio engine lifetime independent of screens. Keep PCM and high-frequency DSP state out of Zustand and the JavaScript bridge.
- No backend is needed for the initial local-file product. Accounts, cloud catalogs, streaming, and synchronization are later scope.

These are architectural intentions from the discussion, not already implemented capabilities or independently validated library selections. Treat illustrative DSP snippets as conceptual examples, not production algorithms.

## Screens and implementation order

Initial screens: home, library (songs, albums, artists, playlists), now playing, queue, and settings. A persistent mini-player opens now playing. Add a development Transition Lab when the engine can support meaningful previews.

1. Foundation: Lumia theme, basic screens, navigation, state, and local persistence.
2. Audio foundation: import/load a local file, play, pause, seek, and native position reporting; address platform audio lifecycle and background playback.
3. Analyzer: waveform, BPM, beat grid, energy, and bass energy, processed off the UI thread and cached.
4. Transitions: two native decks, equal-power crossfade, beat alignment, bass swapping, then tempo matching and improved transition selection. Validate by listening and native timing tests. Key detection and harmonic matching come later.

Organize code by feature, with separate application, audio, database, store, services, shared components, theme, and domain-type boundaries. Add native specifications and shared C++ incrementally as each milestone needs them.

## Repository baseline at review

The app currently contains the React Native starter screen with React Native 0.87.1, React 19.2.3, TypeScript, and safe-area support. The planned state, navigation, database, waveform, and custom audio layers are not yet present in the declared dependencies or application entry point.

## Implementation update — 2026-10-04

The baseline above is historical. Real discovery/import, playback, Zustand, SQLite, and navigation are now implemented. See [Architecture and gap audit](./ARCHITECTURE.md) for current capability boundaries and remaining work.
