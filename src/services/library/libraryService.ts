import { PermissionsAndroid, Platform } from 'react-native';
import NativeLibrary from '../../../specs/NativeMusicLibrary';
import { toTrack } from '../../types/Track';

export async function discoverAudio(requestPermission = false) {
  if (!NativeLibrary) {
    throw new Error(
      'Music library module is unavailable. Rebuild the native app.',
    );
  }
  let granted = true;
  let blocked = false;
  if (Platform.OS === 'android') {
    const permission =
      Number(Platform.Version) >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    granted = await PermissionsAndroid.check(permission);
    if (!granted && requestPermission) {
      const result = await PermissionsAndroid.request(permission);
      granted = result === PermissionsAndroid.RESULTS.GRANTED;
      blocked = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
    }
  }
  return {
    tracks: (await NativeLibrary.scan()).map(toTrack),
    granted,
    blocked,
  };
}
export async function importAudio() {
  if (!NativeLibrary) {
    throw new Error(
      'Music library module is unavailable. Rebuild the native app.',
    );
  }
  return (await NativeLibrary.importFiles()).map(toTrack);
}
