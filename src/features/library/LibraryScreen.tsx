import Icon from '../../components/Icon';
import { useAccent, usePreferences } from '../../store/preferencesStore';
import { useThemedStyles } from '../../theme/useThemedStyles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLibraryStore } from '../../store/libraryStore';
import { usePlayerStore } from '../../store/playerStore';
import MiniPlayer from '../../components/MiniPlayer';
import { Artwork, TextButton, TrackRow } from '../../components/MusicElements';
import {
  SlideHeading,
  SlidePanel,
  useReducedMotion,
} from '../../components/MetroMotion';
import { styles as baseStyles } from '../../theme/styles';
import { theme } from '../../theme/theme';
import type { ScreenProps } from '../../app/navigation';

const categories = ['songs', 'albums', 'artists', 'favorites'] as const;
type Category = (typeof categories)[number];
export default function LibraryScreen({
  navigation,
}: ScreenProps<'Collection'>) {
  const styles = useThemedStyles(baseStyles);
  const library = useLibraryStore();
  const accent = useAccent();
  const preferences = usePreferences();

  const { width } = useWindowDimensions();
  const tileSize = Math.max(80, (width - 60) / 2);
  const reduced = useReducedMotion();
  const pager = useRef<React.ElementRef<typeof ScrollView>>(null);
  const gridOpacity = useRef(new Animated.Value(1)).current;
  const [changingView, setChangingView] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const selectedIndex = useRef(index);
  selectedIndex.current = index;
  const [offsets, setOffsets] = useState([0, 155, 330, 495]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const currentId = usePlayerStore(state => state.status.trackId);
  const playerBusy = usePlayerStore(state => state.busy);
  const category = categories[index];
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(''), 2400);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigation.isFocused()) {
        return false;
      }
      if (group) {
        setGroup(null);
        return true;
      }
      if (search) {
        setSearch(false);
        setQuery('');
        return true;
      }
      return false;
    });
    return () => back.remove();
  }, [group, search, navigation]);
  // Keep the selected page aligned after rotation or returning from an album.
  useEffect(() => {
    pager.current?.scrollTo({
      x: selectedIndex.current * width,
      animated: false,
    });
    scrollX.setValue(selectedIndex.current * width);
  }, [width, group, scrollX]);
  // Keep native animation nodes and the event binding stable across page changes.
  const motion = useMemo(
    () => ({
      panorama: scrollX.interpolate({
        inputRange: [0, width * 3],
        outputRange: [0, -64],
        extrapolate: 'clamp',
      }),
      heading: scrollX.interpolate({
        inputRange: categories.map((_, i) => width * i),
        outputRange: offsets.map(value => -value),
        extrapolate: 'clamp',
      }),
      opacity: categories.map((_, i) =>
        scrollX.interpolate({
          inputRange: [(i - 1) * width, i * width, (i + 1) * width],
          outputRange: [0.32, 1, 0.32],
          extrapolate: 'clamp',
        }),
      ),
    }),
    [scrollX, width, offsets],
  );
  const onPagerScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );
  const matching = library.tracks.filter(track =>
    `${track.title} ${track.artist} ${track.album}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const tracksFor = (page: Category) =>
    matching.filter(
      track =>
        (page !== 'favorites' || library.favorites.includes(track.id)) &&
        (!group ||
          (page === 'albums'
            ? `${track.album} · ${track.artist}`
            : track.artist) === group),
    );
  const changeView = () => {
    if (changingView || preferences.busy) {
      return;
    }
    if (reduced) {
      preferences.update({ songGrid: !preferences.songGrid });
      return;
    }
    setChangingView(true);
    Animated.timing(gridOpacity, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        setChangingView(false);
        return;
      }
      preferences.update({ songGrid: !preferences.songGrid }).finally(() => {
        Animated.timing(gridOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }).start(() => setChangingView(false));
      });
    });
  };
  useEffect(() => () => gridOpacity.stopAnimation(), [gridOpacity]);
  const choosePage = (next: number) => {
    pager.current?.scrollTo({ x: next * width, animated: !reduced });
    if (reduced) {
      setIndex(next);
      scrollX.setValue(next * width);
    }
  };
  const renderPage = (page: Category) => {
    const tracks = tracksFor(page);
    const grouped = !group && (page === 'albums' || page === 'artists');
    if (grouped) {
      const groups = new Map<string, typeof tracks>();
      tracks.forEach(track => {
        const name =
          page === 'albums' ? `${track.album} · ${track.artist}` : track.artist;
        const entries = groups.get(name) ?? [];
        entries.push(track);
        groups.set(name, entries);
      });
      return (
        <FlatList
          key={`${page}-groups`}
          testID={`${page}-list`}
          removeClippedSubviews={false}
          data={[...groups.entries()]}
          numColumns={2}
          columnWrapperStyle={local.gridRow}
          keyExtractor={item => item[0]}
          refreshing={library.busy}
          onRefresh={() => library.scan()}
          contentContainerStyle={local.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: [name, entries] }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${name}`}
              onPress={() => setGroup(name)}
              style={({ pressed }) => [
                local.tile,
                { width: tileSize },
                pressed && styles.touchFeedback,
              ]}
            >
              <Artwork track={entries[0]} size={tileSize} />
              <View>
                <Text numberOfLines={2} style={local.groupTitle}>
                  {name}
                </Text>
                <Text style={styles.muted}>{entries.length} songs</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Empty query={query} favorites={false} />}
        />
      );
    }
    if (preferences.songGrid) {
      return (
        <FlatList
          key={`${page}-grid`}
          testID={`${page}-list`}
          removeClippedSubviews={false}
          data={tracks}
          numColumns={2}
          columnWrapperStyle={local.gridRow}
          keyExtractor={track => track.id}
          contentContainerStyle={local.list}
          refreshing={library.busy}
          onRefresh={() => library.scan()}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play ${item.title} by ${item.artist}`}
              onPress={() => {
                usePlayerStore.getState().start(item, tracks);
                navigation.navigate('Player');
              }}
              style={[local.tile, { width: tileSize }]}
            >
              <Artwork track={item} size={tileSize} />
              <Text
                numberOfLines={2}
                style={[
                  local.groupTitle,
                  item.id === currentId && { color: accent },
                ]}
              >
                {item.title}
              </Text>
              <Text numberOfLines={1} style={styles.muted}>
                {item.artist}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Empty query={query} favorites={page === 'favorites'} />
          }
        />
      );
    }
    return (
      <FlatList
        key={`${page}-rows`}
        testID={`${page}-list`}
        removeClippedSubviews={false}
        data={tracks}
        keyExtractor={track => track.id}
        refreshing={library.busy}
        onRefresh={() => library.scan()}
        contentContainerStyle={local.list}
        keyboardShouldPersistTaps="handled"
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
        ListEmptyComponent={
          <Empty query={query} favorites={page === 'favorites'} />
        }
      />
    );
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={local.masthead}>
        <Text style={local.eyebrow}>
          ON YOUR DEVICE / {library.tracks.length} TRACKS
        </Text>
        <Animated.Text
          accessibilityRole="header"
          style={[
            local.panorama,
            {
              transform: [
                {
                  translateX: reduced ? 0 : motion.panorama,
                },
              ],
            },
          ]}
        >
          my music
        </Animated.Text>
      </View>
      {group ? (
        <View style={local.inset}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setGroup(null)}
            style={local.back}
          >
            <Text style={styles.accent}>‹ all {category}</Text>
          </Pressable>
          <SlideHeading title={group} />
        </View>
      ) : (
        <View style={local.pivotClip}>
          <Animated.View
            style={[
              local.pivots,
              {
                transform: [
                  {
                    translateX: motion.heading,
                  },
                ],
              },
            ]}
          >
            {categories.map((item, i) => (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityLabel={item}
                accessibilityState={{ selected: index === i }}
                onPress={() => choosePage(i)}
                onLayout={event => {
                  const x = event.nativeEvent.layout.x;
                  setOffsets(previous =>
                    previous[i] === x
                      ? previous
                      : previous.map((value, j) => (j === i ? x : value)),
                  );
                }}
                style={local.pivot}
              >
                <Animated.Text
                  style={[
                    local.pivotText,
                    {
                      opacity: motion.opacity[i],
                    },
                  ]}
                >
                  {item}
                </Animated.Text>
              </Pressable>
            ))}
          </Animated.View>
        </View>
      )}
      <View style={local.viewRow}>
        {(!['albums', 'artists'].includes(category) || group) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              preferences.songGrid ? 'Show song list' : 'Show song grid'
            }
            disabled={preferences.busy || changingView}
            onPress={changeView}
            style={local.viewButton}
          >
            <Icon
              name={preferences.songGrid ? 'list' : 'grid'}
              color={accent}
              size={20}
            />
          </Pressable>
        )}
      </View>
      {search && (
        <TextInput
          autoFocus
          accessibilityLabel="Search your collection"
          value={query}
          onChangeText={setQuery}
          placeholder="find your music"
          placeholderTextColor={theme.colors.secondary}
          style={[styles.search, local.search]}
        />
      )}
      {library.busy && (
        <ActivityIndicator accessibilityLabel="Scanning audio" color={accent} />
      )}
      {library.permission === 'denied' && (
        <View style={local.inset}>
          <TextButton
            label="allow audio access"
            onPress={() => library.scan(true)}
          />
        </View>
      )}
      {library.permission === 'blocked' && (
        <View style={local.inset}>
          <TextButton
            label="allow access in settings"
            onPress={() => {
              Linking.openSettings().catch(() =>
                setNotice('Could not open device settings.'),
              );
            }}
          />
        </View>
      )}
      {!!library.error && (
        <Text accessibilityRole="alert" style={[styles.error, local.inset]}>
          {library.error}
        </Text>
      )}
      {!!notice && (
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={2}
          style={[styles.muted, local.inset]}
        >
          {notice}
        </Text>
      )}
      {group ? (
        <SlidePanel key={group}>
          <Animated.View style={[styles.flex, { opacity: gridOpacity }]}>
            {renderPage(category)}
          </Animated.View>
        </SlidePanel>
      ) : (
        <Animated.ScrollView
          ref={pager}
          testID="collection-pager"
          horizontal
          removeClippedSubviews={false}
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.flex}
          scrollEventThrottle={16}
          onScroll={onPagerScroll}
          onMomentumScrollEnd={event =>
            setIndex(
              Math.max(
                0,
                Math.min(
                  3,
                  Math.round(event.nativeEvent.contentOffset.x / width),
                ),
              ),
            )
          }
        >
          {categories.map((item, i) => (
            <Animated.View
              key={item}
              style={{ width, opacity: gridOpacity }}
              accessibilityElementsHidden={i !== index}
              importantForAccessibility={
                i === index ? 'auto' : 'no-hide-descendants'
              }
            >
              {/* Four stable pages; FlatList still virtualizes their rows. */}
              {renderPage(item)}
            </Animated.View>
          ))}
        </Animated.ScrollView>
      )}
      <SafeAreaView
        edges={['bottom']}
        style={local.footer}
        testID="library-footer"
      >
        <MiniPlayer onOpen={() => navigation.navigate('Player')} />
        <View style={local.appBar} testID="library-app-bar">
          <AppAction
            label={search ? 'Close search' : 'Search music'}
            glyph={search ? '×' : 'search'}
            onPress={() => {
              setSearch(!search);
              setQuery('');
            }}
          />
          <AppAction
            label="Play all"
            glyph="▷"
            disabled={!tracksFor(category).length || playerBusy}
            onPress={() => {
              const tracks = tracksFor(category);
              usePlayerStore.getState().start(tracks[0], tracks);
              navigation.navigate('Player');
            }}
          />
          <AppAction
            label="Open queue"
            glyph="≡"
            onPress={() => navigation.navigate('Queue')}
          />
          <AppAction
            label="More options"
            glyph="···"
            onPress={() => setMenu(true)}
          />
        </View>
      </SafeAreaView>
      <Modal
        visible={menu}
        transparent
        animationType={reduced ? 'none' : 'slide'}
        onRequestClose={() => setMenu(false)}
      >
        <View style={local.modal}>
          <Pressable
            accessibilityLabel="Close options"
            accessibilityRole="button"
            style={styles.flex}
            onPress={() => setMenu(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            style={local.sheet}
            accessibilityViewIsModal
          >
            <Text style={local.menuTitle}>more music</Text>
            <MenuAction
              label="import audio"
              disabled={library.busy}
              onPress={() => {
                setMenu(false);
                library.importFiles();
              }}
            />
            <MenuAction
              label="rescan library"
              disabled={library.busy}
              onPress={() => {
                setMenu(false);
                library.scan(true);
              }}
            />
            <MenuAction
              label="settings"
              onPress={() => {
                setMenu(false);
                navigation.navigate('Settings');
              }}
            />
            <MenuAction label="close" onPress={() => setMenu(false)} />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function AppAction({
  label,
  glyph,
  onPress,
  disabled = false,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        local.action,
        (pressed || disabled) && local.dim,
      ]}
    >
      <Icon
        name={
          glyph === 'search'
            ? 'search'
            : glyph === '×'
            ? 'close'
            : glyph === '▷'
            ? 'play'
            : glyph === '≡'
            ? 'list'
            : 'more'
        }
      />
    </Pressable>
  );
}
function MenuAction({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        local.menuAction,
        (pressed || disabled) && local.dim,
      ]}
    >
      <Text style={local.menuText}>{label}</Text>
    </Pressable>
  );
}
function Empty({ query, favorites }: { query: string; favorites: boolean }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.empty}>
      <Text style={styles.heading}>
        {query
          ? 'no matches'
          : favorites
          ? 'your favorites live here'
          : 'make room for music'}
      </Text>
      <Text style={styles.muted}>
        {query
          ? 'Try a different title, album, or artist.'
          : favorites
          ? 'Tap the heart while a song is playing.'
          : 'Allow audio access to load your music. You can also import files from the ··· menu below.'}
      </Text>
    </View>
  );
}
const local = StyleSheet.create({
  gridRow: { gap: 12 },
  tile: { marginBottom: 24, gap: 6 },
  viewRow: { height: 48, alignItems: 'flex-end', paddingHorizontal: 16 },
  viewButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { backgroundColor: '#171717' },
  searchIcon: { width: 28, height: 28 },
  searchLens: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  searchHandle: {
    position: 'absolute',
    width: 12,
    height: 2,
    top: 21,
    left: 17,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  masthead: { paddingLeft: 24, paddingTop: 12, overflow: 'hidden' },
  eyebrow: { color: '#FFFFFF', fontSize: 11, letterSpacing: 1.5 },
  panorama: {
    color: '#FFFFFF',
    fontFamily: theme.lightFont,
    fontSize: 76,
    letterSpacing: -3,
    paddingBottom: 8,
    width: 520,
  },
  inset: { paddingHorizontal: 24 },
  pivotClip: { overflow: 'hidden', paddingLeft: 24, paddingBottom: 12 },
  pivots: { flexDirection: 'row', alignSelf: 'flex-start' },
  pivot: {
    marginRight: 26,
    minHeight: 56,
    justifyContent: 'center',
    flexShrink: 0,
  },
  pivotText: { color: '#FFFFFF', fontFamily: theme.lightFont, fontSize: 42 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  search: { marginHorizontal: 24 },
  group: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    paddingVertical: 14,
  },
  groupTitle: {
    fontFamily: theme.lightFont,
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  back: { minHeight: 40, justifyContent: 'center' },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#171717',
    minHeight: 52,
  },
  action: {
    minWidth: 64,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: '#FFFFFF', fontSize: 30 },
  dim: { opacity: 0.35 },
  modal: { flex: 1, backgroundColor: '#00000088' },
  sheet: { backgroundColor: '#202020', paddingHorizontal: 24, paddingTop: 16 },
  menuTitle: {
    fontFamily: theme.lightFont,
    color: '#FFFFFF',
    fontSize: 36,
    marginBottom: 8,
  },
  menuAction: { minHeight: 52, justifyContent: 'center' },
  menuText: { color: '#FFFFFF', fontSize: 21, fontFamily: theme.lightFont },
});
