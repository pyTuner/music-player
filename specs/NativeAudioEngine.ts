import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type QueueSource = { id: string; uri: string };
export type PlaybackStatus = {
  trackId: string;
  playing: boolean;
  position: number;
  duration: number;
  error: string;
  shuffle?: boolean;
  repeatMode?: string;
  hasNext?: boolean;
};
export interface Spec extends TurboModule {
  setQueue(tracks: QueueSource[], index: number): Promise<void>;
  removeQueueItem(id: string): Promise<void>;
  reorderQueue(ids: string[]): Promise<void>;
  setShuffle(enabled: boolean): Promise<void>;
  setRepeatMode(mode: string): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(seconds: number): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  getStatus(): Promise<PlaybackStatus>;
}
export default TurboModuleRegistry.get<Spec>('NativeAudioEngine');
