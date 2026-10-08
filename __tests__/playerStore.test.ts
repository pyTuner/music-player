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
  reorderQueue: jest.fn(),
  removeQueueItem: jest.fn(),
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

test('relative artwork seeking uses live native position and clamps at song end', async () => {
  engine.getStatus.mockResolvedValue({ ...status, position: 58 });
  await usePlayerStore.getState().seekBy(30, track.id);
  expect(engine.seek).toHaveBeenCalledWith(60);
});
test('relative seeking clamps at zero and ignores a changed track', async () => {
  await usePlayerStore.getState().seekBy(-30, track.id);
  expect(engine.seek).toHaveBeenCalledWith(0);
  engine.seek.mockClear();
  engine.getStatus.mockResolvedValue({ ...status, trackId: 'different' });
  await usePlayerStore.getState().seekBy(5, track.id);
  expect(engine.seek).not.toHaveBeenCalled();
  expect(usePlayerStore.getState().busy).toBe(false);
});

test('reordering preserves playback without rebuilding or seeking the queue', async () => {
  const second = { ...track, id: 'second' };
  usePlayerStore.setState({ queue: [track, second], status });
  await usePlayerStore.getState().moveQueueItem(track.id, 1);
  expect(engine.reorderQueue).toHaveBeenCalledWith(['second', track.id]);
  expect(usePlayerStore.getState().queue).toEqual([second, track]);
  expect(engine.setQueue).not.toHaveBeenCalled();
  expect(engine.seek).not.toHaveBeenCalled();
  expect(engine.play).not.toHaveBeenCalled();
  expect(writePreference).toHaveBeenCalledWith('queue', [second, track]);
});
test('invalid moves do nothing and native reorder failures preserve the displayed order', async () => {
  const queue = [track, { ...track, id: 'second' }];
  usePlayerStore.setState({ queue });
  await usePlayerStore.getState().moveQueueItem(track.id, -1);
  expect(engine.reorderQueue).not.toHaveBeenCalled();
  engine.reorderQueue.mockRejectedValue(new Error('Queue changed'));
  await usePlayerStore.getState().moveQueueItem(track.id, 1);
  expect(usePlayerStore.getState().queue).toEqual(queue);
  expect(usePlayerStore.getState().error).toContain('Queue changed');
  expect(usePlayerStore.getState().busy).toBe(false);
});

test('drag reorder accepts an arbitrary destination and persists native order', async () => {
  const second = { ...track, id: 'second' };
  const third = { ...track, id: 'third' };
  usePlayerStore.setState({ queue: [track, second, third] });
  await usePlayerStore.getState().reorderQueue([second, third, track]);
  expect(engine.reorderQueue).toHaveBeenCalledWith([
    'second',
    'third',
    track.id,
  ]);
  expect(usePlayerStore.getState().queue).toEqual([second, third, track]);
  expect(engine.setQueue).not.toHaveBeenCalled();
});
test('a stale drag cannot overwrite a changed queue', async () => {
  usePlayerStore.setState({ queue: [track] });
  await usePlayerStore
    .getState()
    .reorderQueue([track, { ...track, id: 'other' }]);
  expect(engine.reorderQueue).not.toHaveBeenCalled();
  expect(usePlayerStore.getState().error).toContain('Queue changed');
});
test('swipe removal uses native removal without resetting the remaining queue', async () => {
  usePlayerStore.setState({ queue: [track, { ...track, id: 'other' }] });
  await usePlayerStore.getState().removeQueueItem('other');
  expect(engine.removeQueueItem).toHaveBeenCalledWith('other');
  expect(usePlayerStore.getState().queue).toEqual([track]);
  expect(engine.setQueue).not.toHaveBeenCalled();
  expect(engine.seek).not.toHaveBeenCalled();
});
test('failed swipe removal keeps the row and reports the error', async () => {
  usePlayerStore.setState({ queue: [track] });
  engine.removeQueueItem.mockRejectedValue(new Error('Native unavailable'));
  await usePlayerStore.getState().removeQueueItem(track.id);
  expect(usePlayerStore.getState().queue).toEqual([track]);
  expect(usePlayerStore.getState().busy).toBe(false);
  expect(usePlayerStore.getState().error).toContain('Native unavailable');
});

test('reorders a restored queue before playback without autoplay', async () => {
  const second = { ...track, id: 'audio:2' };
  engine.getStatus.mockResolvedValue({
    ...status,
    trackId: '',
    playing: false,
  });
  usePlayerStore.setState({ queue: [track, second] });
  await usePlayerStore.getState().reorderQueue([second, track]);
  expect(engine.setQueue).toHaveBeenCalledWith([second, track], 0);
  expect(engine.play).not.toHaveBeenCalled();
  expect(usePlayerStore.getState().queue).toEqual([second, track]);
});
test('removes from a restored queue before playback without autoplay', async () => {
  const second = { ...track, id: 'audio:2' };
  engine.getStatus.mockResolvedValue({
    ...status,
    trackId: '',
    playing: false,
  });
  usePlayerStore.setState({ queue: [track, second] });
  await usePlayerStore.getState().removeQueueItem(track.id);
  expect(engine.setQueue).toHaveBeenCalledWith([second], 0);
  expect(engine.play).not.toHaveBeenCalled();
});
