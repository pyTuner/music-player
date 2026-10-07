import { create } from 'zustand';
import {
  loadTracks,
  readPreference,
  saveTracks,
  writePreference,
} from '../database/libraryRepository';
import { discoverAudio, importAudio } from '../services/library/libraryService';
import type { Track } from '../types/Track';

type LibraryState = {
  tracks: Track[];
  favorites: string[];
  busy: boolean;
  error: string;
  includeRecordings: boolean;
  setIncludeRecordings(value: boolean): Promise<void>;
  permission: 'unknown' | 'granted' | 'denied' | 'blocked';
  initialize(): Promise<void>;
  scan(request?: boolean): Promise<void>;
  importFiles(): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
};
let initialized = false;
export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  favorites: [],
  busy: false,
  error: '',
  includeRecordings: false,
  permission: 'unknown',
  async initialize() {
    if (initialized) {
      return;
    }
    initialized = true;
    try {
      const [tracks, favorites, includeRecordings, cacheMode] =
        await Promise.all([
          loadTracks(),
          readPreference<string[]>('favorites', []),
          readPreference<boolean>('includeRecordings', false),
          readPreference<string>('libraryFilterMode', ''),
        ]);
      set({
        // Do not briefly flash the pre-filter library from older app versions.
        tracks:
          cacheMode === (includeRecordings === true ? 'all-v1' : 'music-v1')
            ? tracks
            : [],
        includeRecordings: includeRecordings === true,
        favorites: Array.isArray(favorites)
          ? favorites.filter(id => typeof id === 'string')
          : [],
      });
      await get().scan(true);
    } catch (error) {
      initialized = false;
      set({ error: String(error) });
    }
  },
  async scan(request = false) {
    if (get().busy) {
      return;
    }
    set({ busy: true, error: '' });
    try {
      const result = await discoverAudio(request, get().includeRecordings);
      const tracks = result.tracks.sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      // Permission denial hides inaccessible shared files but does not overwrite their persisted cache.
      if (result.granted) {
        await writePreference('libraryFilterMode', '');
        await saveTracks(tracks);
        await writePreference(
          'libraryFilterMode',
          get().includeRecordings ? 'all-v1' : 'music-v1',
        );
      }
      set({
        tracks,
        permission: result.granted
          ? 'granted'
          : result.blocked
          ? 'blocked'
          : 'denied',
      });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  async importFiles() {
    if (get().busy) {
      return;
    }
    set({ busy: true, error: '' });
    try {
      await importAudio();
    } catch (error) {
      set({ error: String(error) });
      set({ busy: false });
      return;
    }
    set({ busy: false });
    await get().scan();
  },
  async setIncludeRecordings(value) {
    if (get().busy) {
      return;
    }
    const previous = get().includeRecordings;
    set({ busy: true, error: '' });
    try {
      await writePreference('includeRecordings', value);
      set({ includeRecordings: value, tracks: [] });
    } catch (error) {
      set({ includeRecordings: previous, error: String(error), busy: false });
      return;
    }
    set({ busy: false });
    await get().scan();
  },
  async toggleFavorite(id) {
    const favorites = get().favorites.includes(id)
      ? get().favorites.filter(value => value !== id)
      : [...get().favorites, id];
    set({ favorites });
    try {
      await writePreference('favorites', favorites);
    } catch (error) {
      set({ error: `Could not save favorites: ${String(error)}` });
    }
  },
}));
