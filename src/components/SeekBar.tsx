import { useThemedStyles } from '../theme/useThemedStyles';
import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../types/Track';
import { theme } from '../theme/theme';

export function positionAtTouch(x: number, width: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0 || width <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, x / width)) * duration;
}
type Props = {
  position: number;
  duration: number;
  disabled?: boolean;
  onSeek: (seconds: number) => Promise<void>;
  onDraggingChange: (dragging: boolean) => void;
};

export default function SeekBar(props: Props) {
  const styles = useThemedStyles(baseStyles);
  const latest = useRef(props);
  latest.current = props;
  const width = useRef(0);
  const origin = useRef(0);
  const active = useRef(false);
  const mounted = useRef(true);
  const pending = useRef(false);
  const [preview, setPreview] = useState<number | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      latest.current.onDraggingChange(false);
    };
  }, []);
  const commit = async (seconds: number) => {
    if (pending.current) {
      return;
    }
    pending.current = true;
    try {
      await latest.current.onSeek(seconds);
    } finally {
      pending.current = false;
      if (mounted.current) {
        setPreview(null);
      }
    }
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !latest.current.disabled &&
        latest.current.duration > 0 &&
        width.current > 0 &&
        !pending.current,
      onPanResponderGrant: event => {
        origin.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
        active.current = true;
        latest.current.onDraggingChange(true);
        setPreview(
          positionAtTouch(
            event.nativeEvent.locationX,
            width.current,
            latest.current.duration,
          ),
        );
      },
      onPanResponderMove: event => {
        if (active.current) {
          setPreview(
            positionAtTouch(
              event.nativeEvent.pageX - origin.current,
              width.current,
              latest.current.duration,
            ),
          );
        }
      },
      onPanResponderRelease: event => {
        if (!active.current) {
          return;
        }
        active.current = false;
        latest.current.onDraggingChange(false);
        const seconds = positionAtTouch(
          event.nativeEvent.pageX - origin.current,
          width.current,
          latest.current.duration,
        );
        setPreview(seconds);
        commitRef.current(seconds).catch(() => {});
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        active.current = false;
        setPreview(null);
        latest.current.onDraggingChange(false);
      },
    }),
  ).current;
  const duration = Number.isFinite(props.duration)
    ? Math.max(0, props.duration)
    : 0;
  const value = Math.min(duration, Math.max(0, preview ?? props.position));
  const percentage = duration ? (value / duration) * 100 : 0;
  return (
    <View>
      <View
        {...responder.panHandlers}
        testID="seek-slider"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        accessibilityHint="Swipe up or down to seek by ten seconds."
        accessibilityState={{ disabled: !!props.disabled || duration === 0 }}
        accessibilityValue={{
          min: 0,
          max: duration,
          now: value,
          text: `${formatDuration(value)} of ${formatDuration(duration)}`,
        }}
        accessibilityActions={[
          { name: 'increment', label: 'Forward ten seconds' },
          { name: 'decrement', label: 'Back ten seconds' },
        ]}
        onAccessibilityAction={event => {
          if (
            props.disabled ||
            !duration ||
            pending.current ||
            !['increment', 'decrement'].includes(event.nativeEvent.actionName)
          ) {
            return;
          }
          const next = Math.max(
            0,
            Math.min(
              duration,
              value + (event.nativeEvent.actionName === 'increment' ? 10 : -10),
            ),
          );
          setPreview(next);
          commitRef.current(next).catch(() => {});
        }}
        onLayout={event => {
          width.current = event.nativeEvent.layout.width;
        }}
        style={styles.touch}
      >
        <View pointerEvents="none" style={styles.rail}>
          <View style={[styles.fill, { width: `${percentage}%` }]} />
          <View
            style={[
              styles.thumb,
              { left: `${percentage}%` },
              preview !== null && styles.dragging,
            ]}
          />
        </View>
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatDuration(value)}</Text>
        <Text style={styles.time}>−{formatDuration(duration - value)}</Text>
      </View>
    </View>
  );
}
const baseStyles = StyleSheet.create({
  touch: { height: 48, justifyContent: 'center', marginHorizontal: 8 },
  rail: { height: 3, backgroundColor: '#30383A' },
  fill: { height: 3, backgroundColor: theme.colors.accent },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    top: -6.5,
    marginLeft: -8,
  },
  dragging: {
    transform: [{ scale: 1.3 }],
    backgroundColor: theme.colors.accent,
  },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontVariant: ['tabular-nums'],
  },
});
