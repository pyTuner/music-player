import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { TextButton, TrackRow } from '../../components/MusicElements';
import { usePlayerStore } from '../../store/playerStore';
import { styles } from '../../theme/styles';
import type { ScreenProps } from '../../app/navigation';

export default function QueueScreen({ navigation }: ScreenProps<'Queue'>) {
  const player = usePlayerStore();
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>up next</Text>
        <Text style={styles.muted}>
          The native player advances through your queue automatically.
        </Text>
        <View style={styles.row}>
          <TextButton
            label="clear queue"
            disabled={player.busy || !player.queue.length}
            onPress={() => player.changeQueue([])}
          />
        </View>
        {!!player.error && <Text style={styles.error}>{player.error}</Text>}
      </View>
      <FlatList
        data={player.queue}
        keyExtractor={track => track.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View>
            <TrackRow
              track={item}
              selected={item.id === player.status.trackId}
              onPress={() => {
                player.start(item, player.queue);
                navigation.navigate('Player');
              }}
            />
            <View style={styles.row}>
              <TextButton
                label="remove"
                accessibilityLabel={`Remove ${item.title} from queue`}
                disabled={player.busy}
                onPress={() =>
                  player.changeQueue(
                    player.queue.filter(track => track.id !== item.id),
                  )
                }
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.heading}>
            Your next great listen starts in the collection.
          </Text>
        }
      />
    </View>
  );
}
