import type { AudioFile } from '../../specs/NativeMusicLibrary';

export type Track = AudioFile & { color: string };
export function toTrack(file: AudioFile): Track {
  return { ...file, color: '#07566D' };
}
export function formatDuration(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
