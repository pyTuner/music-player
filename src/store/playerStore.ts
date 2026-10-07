import { create } from 'zustand';
import { getAudioEngine } from '../audio/AudioEngine';
import { readPreference, writePreference } from '../database/libraryRepository';
import type { Track } from '../types/Track';
import type { PlaybackStatus } from '../../specs/NativeAudioEngine';

type PlayerState = {
  queue: Track[];
  status: PlaybackStatus;
  busy: boolean;
  error: string;
  restore(): Promise<void>;
  start(track: Track, collection: Track[]): Promise<void>;
  changeQueue(queue: Track[]): Promise<void>;
  command(
    action: 'play' | 'pause' | 'next' | 'previous',
    seconds?: never,
  ): Promise<void>;
  seek(seconds: number): Promise<void>;
  refresh(): Promise<void>;
};
const emptyStatus: PlaybackStatus = {
  trackId: '',
  playing: false,
  position: 0,
  duration: 0,
  error: '',
};
let refreshing = false;
export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  status: emptyStatus,
  busy: false,
  error: '',
  async restore() {
    try {
      const saved = await readPreference<Track[]>('queue', []);
      const queue = Array.isArray(saved)
        ? saved.filter(
            track =>
              track &&
              typeof track.id === 'string' &&
              typeof track.uri === 'string',
          )
        : [];
      set({ queue });
      // Restoring the UI must never interrupt an already-running native session or autoplay.
      const status = await getAudioEngine().getStatus();
      set({ status });
    } catch (error) {
      set({ error: String(error) });
    }
  },
  async start(track, collection) {
    if (get().busy) {
      return;
    }
    const queue = collection.some(item => item.id === track.id)
      ? collection
      : [track];
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      await engine.setQueue(
        queue,
        queue.findIndex(item => item.id === track.id),
      );
      set({ queue });
      await engine.play();
      await writePreference('queue', queue);
      await get().refresh();
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  async changeQueue(queue) {
    if (get().busy) {
      return;
    }
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      const status = await engine.getStatus();
      const index = queue.findIndex(track => track.id === status.trackId);
      await engine.setQueue(queue, Math.max(0, index));
      if (index >= 0 && status.position > 0) {
        await engine.seek(status.position);
      }
      if (queue.length && status.playing) {
        await engine.play();
      }
      set({ queue });
      await writePreference('queue', queue);
      await get().refresh();
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  async command(action) {
    if (get().busy) {
      return;
    }
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      if (action === 'play' && !get().status.trackId && get().queue.length) {
        await engine.setQueue(get().queue, 0);
      }
      await engine[action]();
      await get().refresh();
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  async seek(seconds) {
    if (get().busy || !Number.isFinite(seconds)) {
      return;
    }
    set({ busy: true, error: '' });
    try {
      const duration = get().status.duration;
      await getAudioEngine().seek(
        Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds),
      );
      await get().refresh();
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  async refresh() {
    if (refreshing) {
      return;
    }
    refreshing = true;
    try {
      set({ status: await getAudioEngine().getStatus() });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      refreshing = false;
    }
  },
}));
