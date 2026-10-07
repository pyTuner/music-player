import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Artwork } from '../../components/MusicElements';
import SeekBar from '../../components/SeekBar';
import TransportButton from '../../components/TransportButton';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { styles } from '../../theme/styles';
import { theme } from '../../theme/theme';
import type { ScreenProps } from '../../app/navigation';

export default function PlayerScreen({ navigation }: ScreenProps<'Player'>) {
  const insets = useSafeAreaInsets();
  const player = usePlayerStore();
  const favorites = useLibraryStore(state => state.favorites);
  const [dragging, setDragging] = useState(false);
  const track =
    player.queue.find(item => item.id === player.status.trackId) ??
    player.queue[0];
  const index = player.queue.findIndex(item => item.id === track?.id);
  const next = player.queue[index + 1];
  const loaded = !!track && player.status.trackId === track.id;
  const duration =
    (loaded ? player.status.duration : 0) || track?.duration || 0;
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        local.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      scrollEnabled={!dragging}
    >
      {track ? (
        <>
          <View style={local.topline}>
            <Text style={styles.eyebrow}>
              {player.status.playing ? 'NOW IN ROTATION' : 'TAKE A MOMENT'}
            </Text>
            <Text style={styles.muted}>
              {index + 1} / {player.queue.length}
            </Text>
          </View>
          <Artwork track={track} large />
          <View style={local.metadata}>
            <View style={styles.flex}>
              <Text
                accessibilityLabel={track.title}
                numberOfLines={2}
                ellipsizeMode="tail"
                style={local.title}
              >
                {track.title}
              </Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={local.artist}>
                {track.artist}
              </Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.muted}>
                {track.album}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                favorites.includes(track.id)
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              accessibilityState={{ selected: favorites.includes(track.id) }}
              onPress={() =>
                useLibraryStore.getState().toggleFavorite(track.id)
              }
              style={({ pressed }) => [
                local.favorite,
                pressed && local.pressed,
              ]}
            >
              <Text style={local.heart}>
                {favorites.includes(track.id) ? '♥' : '♡'}
              </Text>
            </Pressable>
          </View>
          <SeekBar
            key={track.id}
            position={loaded ? player.status.position : 0}
            duration={duration}
            disabled={player.busy || !loaded}
            onSeek={player.seek}
            onDraggingChange={setDragging}
          />
          <View style={local.controls}>
            <TransportButton
              kind="previous"
              label="Previous track"
              disabled={player.busy || !loaded || index <= 0}
              onPress={() => player.command('previous')}
            />
            <TransportButton
              primary
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
              disabled={player.busy || !loaded || !next}
              onPress={() => player.command('next')}
            />
          </View>
          <View style={local.secondary}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back fifteen seconds"
              disabled={!loaded || player.busy}
              onPress={() =>
                player.seek(Math.max(0, player.status.position - 15))
              }
              style={local.smallButton}
            >
              <Text style={styles.muted}>↶ 15s</Text>
            </Pressable>
            <Text style={local.localLabel}>YOUR MUSIC. YOUR PACE.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Forward fifteen seconds"
              disabled={!loaded || player.busy}
              onPress={() =>
                player.seek(Math.min(duration, player.status.position + 15))
              }
              style={local.smallButton}
            >
              <Text style={styles.muted}>15s ↷</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View playback queue"
            onPress={() => navigation.navigate('Queue')}
            style={({ pressed }) => [local.upNext, pressed && local.pressed]}
          >
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>UP NEXT</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.text}>
                {next?.title ?? 'The end of this rotation'}
              </Text>
              <Text numberOfLines={1} style={styles.muted}>
                {next?.artist ?? 'Add more music to your queue'}
              </Text>
            </View>
            <Text style={local.queueIcon}>≡</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.heading}>Choose a song from your collection.</Text>
      )}
      {!!(player.error || player.status.error) && (
        <Text accessibilityRole="alert" style={styles.error}>
          {player.error || player.status.error}
        </Text>
      )}
    </ScrollView>
  );
}
const local = StyleSheet.create({
  content: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  topline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontFamily: theme.lightFont,
    color: '#FFFFFF',
    lineHeight: 36,
  },
  artist: {
    color: theme.colors.accent,
    fontSize: 18,
    marginTop: 10,
    marginBottom: 4,
  },
  favorite: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: { fontSize: 30, color: theme.colors.accent },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginTop: 28,
    marginBottom: 12,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  smallButton: {
    minWidth: 52,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#718187',
    flexShrink: 1,
    textAlign: 'center',
  },
  upNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderColor: '#24343A',
    paddingTop: 22,
  },
  queueIcon: { fontSize: 30, color: theme.colors.accent },
  pressed: { opacity: 0.6 },
});
