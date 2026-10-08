import PlayerDrag from './PlayerDrag';
import { useThemedStyles } from '../theme/useThemedStyles';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MarqueeTitle from './MarqueeTitle';
import { Artwork } from './MusicElements';
import TransportButton from './TransportButton';
import { usePlayerStore } from '../store/playerStore';
import { styles as baseStyles } from '../theme/styles';

export default function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const styles = useThemedStyles(baseStyles);
  const player = usePlayerStore();
  const track = player.queue.find(item => item.id === player.status.trackId);
  return (
    <PlayerDrag direction="up" onComplete={onOpen}>
      <View testID="mini-player">
        {track && (
          <View style={styles.mini}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open now playing"
              onPress={onOpen}
            >
              <Artwork track={track} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${track.title}`}
              style={styles.flex}
              onPress={onOpen}
            >
              <MarqueeTitle key={track.id} title={track.title} />
              <Text style={styles.muted} numberOfLines={1}>
                {track.artist}
              </Text>
            </Pressable>
            <TransportButton
              kind={player.status.playing ? 'pause' : 'play'}
              label={player.status.playing ? 'Pause' : 'Play'}
              disabled={player.busy}
              onPress={() =>
                player.command(player.status.playing ? 'pause' : 'play')
              }
            />
          </View>
        )}
      </View>
    </PlayerDrag>
  );
}
