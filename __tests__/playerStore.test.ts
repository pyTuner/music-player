import { usePlayerStore } from '../src/store/playerStore';
import { getAudioEngine } from '../src/audio/AudioEngine';
import { writePreference } from '../src/database/libraryRepository';

jest.mock('../src/audio/AudioEngine', () => ({ getAudioEngine: jest.fn() }));
jest.mock('../src/database/libraryRepository', () => ({
  readPreference: jest.fn(),
  writePreference: jest.fn(),
}));
const track = {
  id: 'audio:1',
  uri: 'file:///song.mp3',
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  duration: 60,
  color: '#07566D',
};
const status = {
  trackId: track.id,
  playing: true,
  position: 12,
  duration: 60,
  error: '',
};
const engine = {
  setQueue: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  seek: jest.fn(),
  getStatus: jest.fn(),
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getAudioEngine).mockReturnValue(engine);
  engine.getStatus.mockResolvedValue(status);
  usePlayerStore.setState({
    queue: [],
    status: { ...status, trackId: '', playing: false },
    busy: false,
    error: '',
  });
});
test('starts the native queue and persists it', async () => {
  await usePlayerStore.getState().start(track, [track]);
  expect(engine.setQueue).toHaveBeenCalledWith([track], 0);
  expect(engine.play).toHaveBeenCalled();
  expect(writePreference).toHaveBeenCalledWith('queue', [track]);
  expect(usePlayerStore.getState().status).toEqual(status);
});
test('queue edits preserve position and playing state', async () => {
  await usePlayerStore.getState().changeQueue([track]);
  expect(engine.seek).toHaveBeenCalledWith(12);
  expect(engine.play).toHaveBeenCalled();
});
test('clearing the queue does not restart playback', async () => {
  await usePlayerStore.getState().changeQueue([]);
  expect(engine.setQueue).toHaveBeenCalledWith([], 0);
  expect(engine.play).not.toHaveBeenCalled();
});
test('native errors do not fabricate successful playback', async () => {
  engine.setQueue.mockRejectedValue(new Error('File unavailable'));
  await usePlayerStore.getState().start(track, [track]);
  expect(engine.play).not.toHaveBeenCalled();
  expect(usePlayerStore.getState().error).toContain('File unavailable');
  expect(usePlayerStore.getState().busy).toBe(false);
});
