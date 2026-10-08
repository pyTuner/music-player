import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import InteractiveArtwork from '../../components/InteractiveArtwork';
import PlayerDrag from '../../components/PlayerDrag';
import { MetroHeader } from '../../components/MetroMotion';
import SeekBar from '../../components/SeekBar';
import TransportButton from '../../components/TransportButton';
import Icon from '../../components/Icon';
import LyricsPanel from '../../components/LyricsPanel';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { useAccent } from '../../store/preferencesStore';
import { theme } from '../../theme/theme';
import type { ScreenProps } from '../../app/navigation';
export default function PlayerScreen({
  navigation,
  route,
}: ScreenProps<'Player'>) {
  const player = usePlayerStore();
  const favorites = useLibraryStore(state => state.favorites);
  const favoriteError = useLibraryStore(state => state.error);
  const accent = useAccent();
  const [seeking, setSeeking] = useState(false);
  const [lyrics, setLyrics] = useState(false);
  const [size, setSize] = useState({ width: 360, height: 500 });
  const compact = size.height < 340;
  const landscape = size.width > size.height * 1.25;
  const track =
    player.queue.find(item => item.id === player.status.trackId) ??
    player.queue[0];
  const index = player.queue.findIndex(item => item.id === track?.id);
  const loaded = !!track && player.status.trackId === track.id;
  const duration =
    (loaded ? player.status.duration : 0) || track?.duration || 0;
  const artSize = Math.max(
    0,
    Math.min(
      360,
      landscape ? size.width * 0.38 : size.width - 48,
      landscape ? size.height - 24 : size.height - 330,
    ),
  );
  return (
    <PlayerDrag
      direction="left"
      disabled={lyrics || seeking}
      onComplete={() => navigation.navigate('Queue')}
    >
      <PlayerDrag
        direction="down"
        disabled={lyrics || seeking}
        onComplete={() => {
          navigation.setOptions({ animation: 'none' });
          navigation.goBack();
        }}
      >
        <MetroHeader
          navigation={navigation}
          route={route}
          options={{ title: 'now playing' }}
          back={{ title: 'music', href: undefined }}
        />
        <SafeAreaView edges={['bottom']} style={local.root}>
          <View
            testID="player-viewport"
            onLayout={event => setSize(event.nativeEvent.layout)}
            style={[local.body, landscape && local.landscape]}
          >
            {track ? (
              <>
                <View style={[local.artSpace, landscape && local.artLandscape]}>
                  {artSize > 40 && (
                    <InteractiveArtwork
                      key={track.id}
                      track={track}
                      size={artSize}
                    />
                  )}
                </View>
                <View style={[local.dock, landscape && local.landscapeDock]}>
                  <View
                    style={[local.metadata, compact && local.compactMetadata]}
                  >
                    <View style={local.flex}>
                      <Text
                        accessibilityLabel={track.title}
                        maxFontSizeMultiplier={1.3}
                        numberOfLines={1}
                        style={[local.title, compact && local.compactTitle]}
                      >
                        {track.title}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        numberOfLines={1}
                        style={[local.artist, { color: accent }]}
                      >
                        {track.artist}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        favorites.includes(track.id)
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                      accessibilityState={{
                        selected: favorites.includes(track.id),
                      }}
                      onPress={() =>
                        useLibraryStore.getState().toggleFavorite(track.id)
                      }
                      style={local.action}
                    >
                      <Icon
                        name="heart"
                        color={accent}
                        filled={favorites.includes(track.id)}
                        size={28}
                      />
                    </Pressable>
                  </View>
                  <SeekBar
                    key={track.id}
                    position={loaded ? player.status.position : 0}
                    duration={duration}
                    disabled={player.busy || !loaded}
                    onSeek={player.seek}
                    onDraggingChange={setSeeking}
                  />
                  <View
                    style={[local.controls, compact && local.compactControls]}
                  >
                    <TransportButton
                      kind="previous"
                      label="Previous track"
                      disabled={player.busy || !loaded}
                      onPress={() => player.command('previous')}
                    />
                    <TransportButton
                      primary
                      compact={compact}
                      kind={player.status.playing ? 'pause' : 'play'}
                      label={player.status.playing ? 'Pause' : 'Play'}
                      disabled={player.busy}
                      onPress={() =>
                        player.command(player.status.playing ? 'pause' : 'play')
                      }
                    />
                    <TransportButton
                      kind="next"
                      label="Next track"
                      disabled={
                        player.busy ||
                        !loaded ||
                        index >= player.queue.length - 1
                      }
                      onPress={() => player.command('next')}
                    />
                  </View>
                  <View style={local.bottom}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Back fifteen seconds"
                      disabled={!loaded || player.busy}
                      onPress={() =>
                        player.seek(Math.max(0, player.status.position - 15))
                      }
                      style={local.action}
                    >
                      <Text style={local.secondary}>−15s</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Open lyrics"
                      onPress={() => setLyrics(true)}
                      style={local.action}
                    >
                      <Icon name="lyrics" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View playback queue"
                      onPress={() => navigation.navigate('Queue')}
                      style={local.action}
                    >
                      <Icon name="list" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Forward fifteen seconds"
                      disabled={!loaded || player.busy}
                      onPress={() =>
                        player.seek(
                          Math.min(duration, player.status.position + 15),
                        )
                      }
                      style={local.action}
                    >
                      <Text style={local.secondary}>+15s</Text>
                    </Pressable>
                  </View>
                  {!!(player.error || player.status.error || favoriteError) && (
                    <Text
                      accessibilityRole="alert"
                      numberOfLines={1}
                      style={local.error}
                    >
                      {player.error || player.status.error || favoriteError}
                    </Text>
                  )}
                </View>
                {lyrics && (
                  <LyricsPanel
                    key={track.id}
                    trackId={track.id}
                    title={track.title}
                    position={loaded ? player.status.position : 0}
                    onClose={() => setLyrics(false)}
                  />
                )}
              </>
            ) : (
              <Text style={[local.title, compact && local.compactTitle]}>
                Choose a song from your collection.
              </Text>
            )}
          </View>
        </SafeAreaView>
      </PlayerDrag>
    </PlayerDrag>
  );
}
const local = StyleSheet.create({
  compactTitle: { fontSize: 22 },
  compactMetadata: { minHeight: 52 },
  compactControls: { marginVertical: 4 },
  root: { flex: 1, backgroundColor: '#000000' },
  body: { flex: 1, paddingHorizontal: 24 },
  landscape: { flexDirection: 'row', gap: 24 },
  artSpace: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artLandscape: { flex: 0.8 },
  dock: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 4 },
  landscapeDock: { flex: 1, width: undefined },
  flex: { flex: 1, minWidth: 0 },
  metadata: { flexDirection: 'row', alignItems: 'center', minHeight: 66 },
  title: { fontSize: 27, fontFamily: theme.lightFont, color: '#FFFFFF' },
  artist: { fontSize: 16, marginTop: 4 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginVertical: 8,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  action: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondary: { color: '#AAAAAA', fontSize: 14 },
  error: { fontSize: 12, color: '#FFBCAB' },
});
