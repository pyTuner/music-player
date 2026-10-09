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
  setShuffle(enabled: boolean): Promise<void>;
  setRepeatMode(mode: 'off' | 'one' | 'all'): Promise<void>;
  setCrossfade(seconds: number): Promise<void>;
  restore(): Promise<void>;
  start(track: Track, collection: Track[]): Promise<void>;
  changeQueue(queue: Track[]): Promise<void>;
  reorderQueue(queue: Track[]): Promise<void>;
  removeQueueItem(id: string): Promise<void>;
  moveQueueItem(id: string, direction: -1 | 1): Promise<void>;
  command(
    action: 'play' | 'pause' | 'next' | 'previous',
    seconds?: never,
  ): Promise<void>;
  seek(seconds: number): Promise<void>;
  seekBy(delta: number, expectedTrackId: string): Promise<void>;
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
  async setShuffle(enabled) {
    if (get().busy) return;
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      await engine.setShuffle(enabled);
      set({ status: await engine.getStatus() });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  async setRepeatMode(mode) {
    if (get().busy) return;
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      await engine.setRepeatMode(mode);
      set({ status: await engine.getStatus() });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  async setCrossfade(seconds) {
    if (get().busy) return;
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 12) {
      set({ error: 'Choose a crossfade duration between 0 and 12 seconds.' });
      return;
    }
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      await engine.setCrossfade(seconds);
      set({ status: await engine.getStatus() });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
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
  async moveQueueItem(id, direction) {
    if (get().busy) {
      return;
    }
    const queue = [...get().queue];
    const from = queue.findIndex(track => track.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= queue.length) {
      return;
    }
    queue.splice(to, 0, queue.splice(from, 1)[0]);
    await get().reorderQueue(queue);
  },
  async reorderQueue(queue) {
    if (get().busy) {
      return;
    }
    const current = get().queue;
    const ids = new Set(queue.map(track => track.id));
    if (
      queue.length !== current.length ||
      ids.size !== current.length ||
      current.some(track => !ids.has(track.id))
    ) {
      set({ error: 'Queue changed. Please try reordering again.' });
      return;
    }
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      const status = await engine.getStatus();
      if (status.trackId) {
        await engine.reorderQueue(queue.map(track => track.id));
      } else {
        await engine.setQueue(queue, 0);
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
  async removeQueueItem(id) {
    if (get().busy || !get().queue.some(track => track.id === id)) {
      return;
    }
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      const status = await engine.getStatus();
      const queue = get().queue.filter(track => track.id !== id);
      if (status.trackId) {
        await engine.removeQueueItem(id);
      } else {
        await engine.setQueue(queue, 0);
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
  async seekBy(delta, expectedTrackId) {
    if (get().busy || !Number.isFinite(delta)) {
      return;
    }
    set({ busy: true, error: '' });
    try {
      const engine = getAudioEngine();
      const current = await engine.getStatus();
      if (current.trackId !== expectedTrackId || current.duration <= 0) {
        return;
      }
      await engine.seek(
        Math.max(0, Math.min(current.duration, current.position + delta)),
      );
      set({ status: await engine.getStatus() });
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
