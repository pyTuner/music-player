import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Artwork, TextButton } from '../../components/MusicElements';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { formatDuration } from '../../types/Track';
import { styles } from '../../theme/styles';
import type { ScreenProps } from '../../app/navigation';

export default function PlayerScreen({ navigation }: ScreenProps<'Player'>) {
  const player = usePlayerStore();
  const favorites = useLibraryStore(state => state.favorites);
  const track =
    player.queue.find(item => item.id === player.status.trackId) ??
    player.queue[0];
  const duration = player.status.duration || track?.duration || 0;
  const progress = duration
    ? Math.min(100, (player.status.position / duration) * 100)
    : 0;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>
        {player.status.playing ? 'IN THE MOMENT' : 'READY WHEN YOU ARE'}
      </Text>
      {!!(player.error || player.status.error) && (
        <Text accessibilityRole="alert" style={styles.error}>
          {player.error || player.status.error}
        </Text>
      )}
      {track ? (
        <>
          <Artwork track={track} large />
          <Text style={styles.trackTitle}>{track.title}</Text>
          <Text style={styles.heading}>{track.artist}</Text>
          <Text style={styles.muted}>{track.album}</Text>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
            style={styles.progress}
          >
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.muted}>
            {formatDuration(player.status.position)} /{' '}
            {formatDuration(duration)}
          </Text>
          <View style={styles.row}>
            <TextButton
              label="previous"
              disabled={player.busy}
              onPress={() => player.command('previous')}
            />
            <TextButton
              label={player.status.playing ? 'pause' : 'play'}
              disabled={player.busy}
              onPress={() =>
                player.command(player.status.playing ? 'pause' : 'play')
              }
            />
            <TextButton
              label="next"
              disabled={player.busy}
              onPress={() => player.command('next')}
            />
          </View>
          <View style={styles.row}>
            <TextButton
              label="−15 sec"
              disabled={player.busy}
              onPress={() => player.seek(player.status.position - 15)}
            />
            <TextButton
              label="+15 sec"
              disabled={player.busy}
              onPress={() =>
                player.seek(Math.min(duration, player.status.position + 15))
              }
            />
            <TextButton
              label={favorites.includes(track.id) ? '♥ saved' : '♡ favorite'}
              onPress={() =>
                useLibraryStore.getState().toggleFavorite(track.id)
              }
            />
          </View>
          <TextButton
            label={`view queue (${player.queue.length})`}
            onPress={() => navigation.navigate('Queue')}
          />
        </>
      ) : (
        <Text style={styles.heading}>Choose a song from your collection.</Text>
      )}
    </ScrollView>
  );
}
