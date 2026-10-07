import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type AudioFile = {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
};

export interface Spec extends TurboModule {
  scan(includeRecordings: boolean): Promise<AudioFile[]>;
  importFiles(): Promise<AudioFile[]>;
}

export default TurboModuleRegistry.get<Spec>('NativeMusicLibrary');
