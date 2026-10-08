import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import InteractiveArtwork from '../src/components/InteractiveArtwork';
import { usePlayerStore } from '../src/store/playerStore';
jest.mock('../src/audio/AudioEngine', () => ({}));
jest.mock('../src/database/libraryRepository', () => ({}));
const track = {
  id: 'tap-song',
  uri: 'file:///song.wav',
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  duration: 90,
  color: '#07566D',
};
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});
test('burst taps produce one accumulated seek and center taps toggle playback', async () => {
  const seekBy = jest.fn();
  const command = jest.fn();
  usePlayerStore.setState({
    busy: false,
    seekBy,
    command,
    status: {
      trackId: track.id,
      playing: true,
      position: 10,
      duration: 90,
      error: '',
    },
  });
  let view!: Renderer.ReactTestRenderer;
  await act(async () => {
    view = Renderer.create(<InteractiveArtwork track={track} size={240} />);
  });
  const side = view.root.findAllByProps({
    accessibilityLabel: 'Forward five seconds',
  })[0];
  await act(async () => {
    side.props.onPress();
    side.props.onPress();
    side.props.onPress();
    side.props.onPress();
  });
  expect(seekBy).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(321);
  });
  expect(seekBy).toHaveBeenCalledTimes(1);
  expect(seekBy).toHaveBeenCalledWith(15, track.id);
  await act(async () => {
    view.root
      .findAllByProps({ accessibilityLabel: 'Pause from artwork' })[0]
      .props.onPress();
  });
  expect(command).toHaveBeenCalledWith('pause');
  await act(async () => view.unmount());
});
test('leaving a track cancels pending artwork seeks', async () => {
  const seekBy = jest.fn();
  usePlayerStore.setState({ busy: false, seekBy });
  let view!: Renderer.ReactTestRenderer;
  await act(async () => {
    view = Renderer.create(<InteractiveArtwork track={track} size={240} />);
  });
  await act(async () => {
    const side = view.root.findAllByProps({
      accessibilityLabel: 'Rewind five seconds',
    })[0];
    side.props.onPress();
    side.props.onPress();
  });
  await act(async () => view.unmount());
  jest.advanceTimersByTime(1000);
  expect(seekBy).not.toHaveBeenCalled();
});
