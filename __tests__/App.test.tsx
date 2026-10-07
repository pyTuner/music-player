import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import LibraryScreen from '../src/features/library/LibraryScreen';
import { useLibraryStore } from '../src/store/libraryStore';
import { TrackRow } from '../src/components/MusicElements';
import type { ScreenProps } from '../src/app/navigation';

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
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<LibraryScreen {...props} />);
  });
  expect(renderer.root.findAllByType(TrackRow)).toHaveLength(2);
  await ReactTestRenderer.act(() => {
    renderer.root.findByType(TextInput).props.onChangeText('recordings');
  });
  expect(renderer.root.findAllByType(TrackRow)).toHaveLength(1);
  expect(renderer.root.findByType(TrackRow).props.track.title).toBe(
    'Voice memo',
  );
  await ReactTestRenderer.act(() => renderer.unmount());
});
