# Project preferences

## Current scope — 2026-10-07

- Target Android only for current implementation and validation; defer iOS work until requested.
- Preserve the Windows Lumia / Metro inspiration: oversized light typography, horizontal pivot navigation, sliding pages and headers, black canvas, restrained cyan accents.
- Keep the library uncluttered: compact bottom app bar, import/rescan in overflow, search on demand.
- Work in the existing MusicPlayer project; do not create a replacement project.
- Use Android system sans-serif-light; no unlicensed Segoe font assets.

## Player and library — 2026-10-08

- Keep playback controls visible without scrolling; shrink artwork and use compact landscape controls.
- Albums/artists use Metro grids. Songs have a persisted list/grid preference.
- Use SVG vector icons, including the favorite heart.
- Accent colours are selectable in Settings and saved locally.
- Lyrics are manually pasted per song (plain text or LRC); timestamped lines highlight during playback. Automatic lookup and embedded lyric extraction are not implemented.

## Android swipe stability — 2026-10-08

- Reported device: OnePlus Nord CE3, Android 15; release closes during forward/reverse library swipes.
- Keep four section lists mounted while paging, with Android clipping disabled for the nested pager/lists. Keep animation bindings stable and only realign the pager on viewport/group changes.
- Exact reported device crash has not yet been reproduced locally; do not treat emulator validation as device confirmation.

## Player gestures — 2026-10-08

- Android native gesture events drive native Animated transforms for vertical player movement; native stack presents Now Playing from the bottom. Short downward drags spring back; completed drags minimize.
- Tap or swipe up on the mini-player to expand. Keep seeking isolated from minimize gestures.
- Artwork center toggles playback. Side tap bursts: two taps = 5 seconds, three = 10, four = 15, five or more = 30. Burst ends after 320 ms; clamp to native duration and ignore stale track IDs.
- Native previous restarts above five seconds; otherwise moves to previous item (or restarts the first item).
- Reserve the list/grid toggle row in all pivot sections to prevent vertical content jumps. View changes fade through native Animated opacity.

## Queue interaction — 2026-10-08

- Swipe left on Now Playing to open the current queue; horizontal seeking disables the screen gesture.
- Hold a queue drag handle and move vertically to reorder songs. Android reorders existing MediaItems in place, preserving current playback and position. Persist the new order after native success.

## Current development preference

- Use Android debug builds for ongoing development. Do not build release APKs unless explicitly requested.
- Now Playing opens the queue with a LEFT swipe. Swipe RIGHT on the queue header/empty area to return; right swipes on rows add favorites.
- Long-press queue drag handles and move vertically to reorder; swipe rows left to remove. Clear queue belongs in the overflow menu.

## Playback modes

- Now Playing has native Android shuffle and a repeat cycle: off → queue → one → off. Highlight active modes with the chosen accent; repeat-one uses its own SVG icon.
- Media3 owns playback order/repetition, including background playback. PlaybackService persists mode changes locally. Queue ordering remains editable; shuffle changes traversal, not the displayed sequence.
- Large cover initials use bold, tall condensed uppercase lettering; small library initials retain their existing typography.
