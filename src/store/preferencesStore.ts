import { create } from 'zustand';
import { readPreference, writePreference } from '../database/libraryRepository';
export const accents = {
  cyan: '#00B7E8',
  magenta: '#F05BA6',
  lime: '#A4C639',
  orange: '#F59E42',
  violet: '#B49AFF',
  red: '#FF6666',
};
export type Accent = keyof typeof accents;
type State = {
  accent: Accent;
  songGrid: boolean;
  busy: boolean;
  error: string;
  initialize(): Promise<void>;
  update(patch: Partial<Pick<State, 'accent' | 'songGrid'>>): Promise<void>;
};
export const usePreferences = create<State>((set, get) => ({
  accent: 'cyan',
  songGrid: false,
  busy: false,
  error: '',
  async initialize() {
    try {
      const value = await readPreference<{
        accent?: string;
        songGrid?: boolean;
      }>('appearance', {});
      set({
        accent:
          value &&
          typeof value.accent === 'string' &&
          Object.hasOwn(accents, value.accent)
            ? (value.accent as Accent)
            : 'cyan',
        songGrid: value?.songGrid === true,
      });
    } catch {
      set({ error: 'Could not load appearance preferences.' });
    }
  },
  async update(patch) {
    if (get().busy) {
      return;
    }
    const previous = { accent: get().accent, songGrid: get().songGrid };
    const next = { ...previous, ...patch };
    set({ ...next, busy: true, error: '' });
    try {
      await writePreference('appearance', next);
    } catch {
      set({
        ...previous,
        error: 'Could not save appearance preferences. Please try again.',
      });
    } finally {
      set({ busy: false });
    }
  },
}));
export const useAccent = () => accents[usePreferences(state => state.accent)];
