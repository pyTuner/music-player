import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLibraryStore } from '../../store/libraryStore';
import { usePlayerStore } from '../../store/playerStore';
import { Artwork, TextButton, TrackRow } from '../../components/MusicElements';
import { styles } from '../../theme/styles';
import { theme } from '../../theme/theme';
import type { ScreenProps } from '../../app/navigation';

const categories = ['songs', 'albums', 'artists', 'favorites'] as const;
export default function LibraryScreen({
  navigation,
}: ScreenProps<'Collection'>) {
  const library = useLibraryStore();
  const [category, setCategory] =
    useState<(typeof categories)[number]>('songs');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const currentId = usePlayerStore(state => state.status.trackId);
  const playerBusy = usePlayerStore(state => state.busy);
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(''), 2400);
    return () => clearTimeout(timer);
  }, [notice]);
  const tracks = library.tracks.filter(track => {
    const matches = `${track.title} ${track.artist} ${track.album}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return (
      matches &&
      (category !== 'favorites' || library.favorites.includes(track.id)) &&
      (!group ||
        (category === 'albums'
          ? `${track.album} · ${track.artist}` === group
          : track.artist === group))
    );
  });
  const grouped = !group && (category === 'albums' || category === 'artists');
  const groups = [
    ...new Set(
      tracks.map(track =>
        category === 'albums'
          ? `${track.album} · ${track.artist}`
          : track.artist,
      ),
    ),
  ];
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          ON YOUR DEVICE / {library.tracks.length} TRACKS
        </Text>
        <Text style={styles.title}>
          your rotation<Text style={styles.active}>.</Text>
        </Text>
        <Text style={styles.muted}>
          {library.includeRecordings
            ? 'All your audio, in one place.'
            : 'Less noise. More music.'}
        </Text>
        <View style={styles.row}>
          <TextButton
            primary
            label="▶ play all"
            disabled={!tracks.length || playerBusy}
            onPress={() => {
              usePlayerStore.getState().start(tracks[0], tracks);
              navigation.navigate('Player');
            }}
          />
          <TextButton
            label="import audio"
            disabled={library.busy}
            onPress={() => library.importFiles()}
          />
          <TextButton
            label="rescan"
            disabled={library.busy}
            onPress={() => library.scan(true)}
          />
          <TextButton
            label="queue"
            onPress={() => navigation.navigate('Queue')}
          />
        </View>
        {library.busy && (
          <ActivityIndicator
            accessibilityLabel="Scanning audio"
            color={theme.colors.accent}
          />
        )}
        {library.permission === 'denied' && (
          <Text style={styles.muted}>
            Allow audio access to discover your device library. You can also
            import files individually.
          </Text>
        )}
        {library.permission === 'blocked' && (
          <TextButton
            label="allow access in settings"
            onPress={() => {
              Linking.openSettings().catch(() =>
                setNotice('Could not open device settings.'),
              );
            }}
          />
        )}
        {!!library.error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {library.error}
          </Text>
        )}
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {notice}
          </Text>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
        >
          {categories.map(item => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: category === item }}
              onPress={() => {
                setCategory(item);
                setGroup(null);
              }}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.touchFeedback,
              ]}
            >
              <Text
                style={[styles.tabText, category === item && styles.active]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          accessibilityLabel="Search your collection"
          value={query}
          onChangeText={setQuery}
          placeholder="find your music"
          placeholderTextColor={theme.colors.secondary}
          style={styles.search}
        />
        {group && (
          <TextButton
            label={`← all ${category}`}
            onPress={() => setGroup(null)}
          />
        )}
      </View>
      {grouped ? (
        <FlatList
          data={groups}
          refreshing={library.busy}
          onRefresh={() => library.scan()}
          keyExtractor={item => item}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setGroup(item)}
              style={({ pressed }) => [
                styles.group,
                styles.groupRow,
                pressed && styles.touchFeedback,
              ]}
            >
              <Artwork
                track={
                  tracks.find(
                    track =>
                      (category === 'albums'
                        ? `${track.album} · ${track.artist}`
                        : track.artist) === item,
                  )!
                }
              />
              <View style={styles.flex}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={styles.text}
                >
                  {item}
                </Text>
                <Text style={styles.muted}>
                  {
                    tracks.filter(
                      track =>
                        (category === 'albums'
                          ? `${track.album} · ${track.artist}`
                          : track.artist) === item,
                    ).length
                  }{' '}
                  songs
                </Text>
              </View>
              <Text style={styles.accent}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Empty query={query} />}
        />
      ) : (
        <FlatList
          data={tracks}
          refreshing={library.busy}
          onRefresh={() => library.scan()}
          keyExtractor={track => track.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              selected={item.id === currentId}
              onPress={() => {
                usePlayerStore.getState().start(item, tracks);
                navigation.navigate('Player');
              }}
              onAdd={() => {
                const player = usePlayerStore.getState();
                if (!player.queue.some(track => track.id === item.id)) {
                  player.changeQueue([...player.queue, item]);
                }
                setNotice(`${item.title} added to queue`);
              }}
            />
          )}
          ListEmptyComponent={<Empty query={query} />}
        />
      )}
    </View>
  );
}
function Empty({ query }: { query: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.heading}>
        {query ? 'no matches' : 'make room for music'}
      </Text>
      <Text style={styles.muted}>
        {query
          ? 'Try a different title, album, or artist.'
          : Platform.OS === 'android'
          ? 'Allow audio access or import MP3, M4A, FLAC, WAV, and other audio files. Format support depends on your device.'
          : 'Import audio from Files. Your imported collection loads automatically the next time you open the app.'}
      </Text>
    </View>
  );
}
