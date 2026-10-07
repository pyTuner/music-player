import { useLibraryStore } from '../src/store/libraryStore';
import {
  discoverAudio,
  importAudio,
} from '../src/services/library/libraryService';
import { saveTracks, writePreference } from '../src/database/libraryRepository';

jest.mock('../src/services/library/libraryService', () => ({
  discoverAudio: jest.fn(),
  importAudio: jest.fn(),
}));
jest.mock('../src/database/libraryRepository', () => ({
  loadTracks: jest.fn(),
  readPreference: jest.fn(),
  saveTracks: jest.fn(),
  writePreference: jest.fn(),
}));
const track = {
  id: 'audio:1',
  uri: 'content://media/1',
  title: 'My recording',
  artist: 'Unknown artist',
  album: 'Recordings',
  duration: 30,
  color: '#07566D',
};

beforeEach(() => {
  jest.resetAllMocks();
  useLibraryStore.setState({
    tracks: [],
    favorites: [],
    busy: false,
    error: '',
    permission: 'unknown',
  });
});
test('successful discovery persists real metadata', async () => {
  jest
    .mocked(discoverAudio)
    .mockResolvedValue({ tracks: [track], granted: true, blocked: false });
  await useLibraryStore.getState().scan(true);
  expect(discoverAudio).toHaveBeenCalledWith(true);
  expect(saveTracks).toHaveBeenCalledWith([track]);
  expect(useLibraryStore.getState().tracks).toEqual([track]);
});
test('permission denial preserves the persisted library and exposes recovery state', async () => {
  jest
    .mocked(discoverAudio)
    .mockResolvedValue({ tracks: [], granted: false, blocked: true });
  await useLibraryStore.getState().scan(true);
  expect(saveTracks).not.toHaveBeenCalled();
  expect(useLibraryStore.getState().permission).toBe('blocked');
});
test('scan failure retains current tracks and clears loading state', async () => {
  useLibraryStore.setState({ tracks: [track] });
  jest.mocked(discoverAudio).mockRejectedValue(new Error('Storage removed'));
  await useLibraryStore.getState().scan();
  expect(useLibraryStore.getState().tracks).toEqual([track]);
  expect(useLibraryStore.getState().error).toContain('Storage removed');
  expect(useLibraryStore.getState().busy).toBe(false);
});
test('import refreshes the complete native library', async () => {
  jest.mocked(importAudio).mockResolvedValue([track]);
  jest
    .mocked(discoverAudio)
    .mockResolvedValue({ tracks: [track], granted: true, blocked: false });
  await useLibraryStore.getState().importFiles();
  expect(importAudio).toHaveBeenCalled();
  expect(saveTracks).toHaveBeenCalledWith([track]);
});
test('favorites are persisted and can be removed', async () => {
  await useLibraryStore.getState().toggleFavorite(track.id);
  expect(writePreference).toHaveBeenLastCalledWith('favorites', [track.id]);
  await useLibraryStore.getState().toggleFavorite(track.id);
  expect(writePreference).toHaveBeenLastCalledWith('favorites', []);
});
