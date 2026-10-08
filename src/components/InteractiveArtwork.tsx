import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Artwork } from './MusicElements';
import { usePlayerStore } from '../store/playerStore';
import { tapSeekSeconds } from '../services/artworkTaps';
import type { Track } from '../types/Track';
export default function InteractiveArtwork({
  track,
  size,
}: {
  track: Track;
  size: number;
}) {
  const playing = usePlayerStore(state => state.status.playing);
  const busy = usePlayerStore(state => state.busy);
  const [feedback, setFeedback] = useState('');
  const burst = useRef({ direction: 0, count: 0, completed: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(fadeTimer.current);
    },
    [],
  );
  const show = (text: string) => {
    clearTimeout(fadeTimer.current);
    setFeedback(text);
    fadeTimer.current = setTimeout(() => setFeedback(''), 850);
  };
  const tap = (direction: number) => {
    clearTimeout(timer.current);
    const current = burst.current;
    if (current.direction !== direction) {
      current.completed += current.direction * tapSeekSeconds(current.count);
      current.direction = direction;
      current.count = 0;
    }
    current.count = Math.min(5, current.count + 1);
    const delta = current.completed + direction * tapSeekSeconds(current.count);
    if (current.count >= 2) {
      show(`${delta > 0 ? '+' : ''}${delta}s`);
    }
    timer.current = setTimeout(() => {
      burst.current = { direction: 0, count: 0, completed: 0 };
      if (delta !== 0) {
        usePlayerStore.getState().seekBy(delta, track.id);
      }
    }, 320);
  };
  return (
    <View style={{ width: size, height: size }}>
      <Artwork track={track} large size={size} />
      <View style={local.zones}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rewind five seconds"
          accessibilityHint="Double tap the left of the artwork; repeat taps to seek further."
          disabled={busy}
          onPress={() => tap(-1)}
          accessibilityActions={[
            { name: 'activate', label: 'Rewind five seconds' },
          ]}
          onAccessibilityAction={() =>
            usePlayerStore.getState().seekBy(-5, track.id)
          }
          style={local.zone}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            playing ? 'Pause from artwork' : 'Play from artwork'
          }
          disabled={busy}
          onPress={() => {
            clearTimeout(timer.current);
            burst.current = { direction: 0, count: 0, completed: 0 };
            show(playing ? 'paused' : 'playing');
            usePlayerStore.getState().command(playing ? 'pause' : 'play');
          }}
          style={local.zone}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forward five seconds"
          accessibilityHint="Double tap the right of the artwork; repeat taps to seek further."
          disabled={busy}
          onPress={() => tap(1)}
          accessibilityActions={[
            { name: 'activate', label: 'Forward five seconds' },
          ]}
          onAccessibilityAction={() =>
            usePlayerStore.getState().seekBy(5, track.id)
          }
          style={local.zone}
        />
      </View>
      {!!feedback && (
        <View pointerEvents="none" style={local.feedback}>
          <Text accessibilityLiveRegion="polite" style={local.text}>
            {feedback}
          </Text>
        </View>
      )}
    </View>
  );
}
const local = StyleSheet.create({
  zones: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  zone: { flex: 1 },
  feedback: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    padding: 12,
    backgroundColor: '#000000BB',
  },
  text: { color: '#FFFFFF', fontSize: 24 },
});
