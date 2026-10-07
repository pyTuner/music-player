import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import LibraryScreen from '../src/features/library/LibraryScreen';
import { useLibraryStore } from '../src/store/libraryStore';
import { TrackRow } from '../src/components/MusicElements';
import type { ScreenProps } from '../src/app/navigation';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

jest.mock('../src/database/libraryRepository', () => ({}));
jest.mock('../src/services/library/libraryService', () => ({}));
jest.mock('../src/audio/AudioEngine', () => ({}));

test('search filters real library metadata without a sample catalog', async () => {
  useLibraryStore.setState({
    tracks: [
      {
        id: '1',
        uri: 'file:///voice.wav',
        title: 'Voice memo',
        album: 'Recordings',
        artist: 'Me',
        duration: 10,
        color: '#07566D',
      },
      {
        id: '2',
        uri: 'file:///music.mp3',
        title: 'Evening',
        album: 'My album',
        artist: 'Artist',
        duration: 60,
        color: '#07566D',
      },
    ],
    busy: false,
    favorites: [],
    error: '',
    permission: 'granted',
  });
  const props = {
    navigation: { navigate: jest.fn() },
    route: { key: 'collection', name: 'Collection' },
  } as unknown as ScreenProps<'Collection'>;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<LibraryScreen {...props} />);
  });
  expect(renderer.root.findAllByType(TrackRow)).toHaveLength(2);
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ label: 'Search music' }).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer.root.findByType(TextInput).props.onChangeText('recordings');
  });
  expect(renderer.root.findAllByType(TrackRow)).toHaveLength(1);
  expect(renderer.root.findByType(TrackRow).props.track.title).toBe(
    'Voice memo',
  );
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('pivot navigation follows swipes, opens groups, and keeps import in overflow', async () => {
  useLibraryStore.setState({
    tracks: [
      {
        id: 'pivot',
        uri: 'file:///song.mp3',
        title: 'Night drive',
        artist: 'Artist',
        album: 'After dark',
        duration: 60,
        color: '#07566D',
      },
    ],
    favorites: [],
    busy: false,
    error: '',
    permission: 'granted',
  });
  const props = {
    navigation: { navigate: jest.fn() },
    route: { key: 'collection', name: 'Collection' },
  } as unknown as ScreenProps<'Collection'>;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<LibraryScreen {...props} />);
  });
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  const pager = renderer.root.findByProps({ testID: 'collection-pager' });
  const pageWidth = pager.props.children[0].props.style.width;
  await ReactTestRenderer.act(async () => {
    pager.props.onMomentumScrollEnd({
      nativeEvent: { contentOffset: { x: pageWidth } },
    });
  });
  expect(
    renderer.root.findAllByProps({
      accessibilityRole: 'tab',
      accessibilityLabel: 'albums',
    })[0].props.accessibilityState.selected,
  ).toBe(true);
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findAllByProps({ accessibilityLabel: 'Open After dark · Artist' })[0]
      .props.onPress();
  });
  expect(
    renderer.root.findAllByProps({ testID: 'collection-pager' }),
  ).toHaveLength(0);
  expect(renderer.root.findByType(TrackRow).props.track.title).toBe(
    'Night drive',
  );
  expect(renderer.root.findAllByProps({ label: 'import audio' })).toHaveLength(
    0,
  );
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ label: 'More options' }).props.onPress();
  });
  expect(renderer.root.findByProps({ label: 'import audio' })).toBeTruthy();
  await ReactTestRenderer.act(async () => renderer.unmount());
});
