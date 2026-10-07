import NativeEngine from '../../specs/NativeAudioEngine';

export function getAudioEngine() {
  if (!NativeEngine) {
    throw new Error('Audio engine is unavailable. Rebuild the native app.');
  }
  return NativeEngine;
}
