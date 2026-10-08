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
