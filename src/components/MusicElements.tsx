import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Track, formatDuration } from '../types/Track';
import { theme } from '../theme/theme';

export function TextButton({
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
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Artwork({
  track,
  large = false,
}: {
  track: Track;
  large?: boolean;
}) {
  return (
    <View
      accessible={false}
      style={[
        styles.art,
        large && styles.largeArt,
        { backgroundColor: track.color },
      ]}
    >
      <Text style={[styles.artLetter, large && styles.largeLetter]}>
        {track.album.charAt(0).toLowerCase()}
      </Text>
      {large && (
        <Text style={styles.artCaption}>{track.album.toUpperCase()}</Text>
      )}
    </View>
  );
}

export function TrackRow({
  track,
  selected,
  onPress,
  onAdd,
}: {
  track: Track;
  selected?: boolean;
  onPress: () => void;
  onAdd?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${track.title} by ${track.artist}`}
        onPress={onPress}
        style={({ pressed }) => [styles.track, pressed && styles.pressed]}
      >
        <Artwork track={track} />
        <View style={styles.metadata}>
          <Text style={[styles.title, selected && styles.selected]}>
            {track.title}
          </Text>
          <Text style={styles.subtitle}>
            {track.artist} · {formatDuration(track.duration)}
          </Text>
        </View>
      </Pressable>
      {onAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${track.title} to queue`}
          onPress={onAdd}
          style={styles.add}
        >
          <Text style={styles.plus}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  buttonText: { color: theme.colors.foreground, fontSize: 16 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  art: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeArt: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    marginVertical: 20,
  },
  artLetter: { color: '#FFFFFF', fontSize: 38, fontFamily: theme.lightFont },
  largeLetter: { fontSize: 150 },
  artCaption: {
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 3,
    marginBottom: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  track: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  metadata: { flex: 1, marginLeft: 14 },
  title: {
    fontSize: 21,
    color: theme.colors.foreground,
    fontFamily: theme.lightFont,
  },
  selected: { color: theme.colors.accent },
  subtitle: { fontSize: 13, color: theme.colors.secondary, marginTop: 5 },
  add: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 28, color: theme.colors.accent },
});
