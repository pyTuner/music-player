import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Track, formatDuration } from '../types/Track';
import { theme } from '../theme/theme';

export function TextButton({
  label,
  onPress,
  disabled = false,
  primary = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primaryButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.buttonText, primary && styles.primaryText]}
      >
        {label}
      </Text>
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
      {large && (
        <View style={styles.disc}>
          <View style={styles.innerDisc}>
            <View style={styles.spindle} />
          </View>
        </View>
      )}
      <Text
        numberOfLines={1}
        style={[styles.artLetter, large && styles.largeLetter]}
      >
        {track.title.charAt(0).toLowerCase()}
      </Text>
      {large && (
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.artCaption}>
          {track.album.toUpperCase()}
        </Text>
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
    <View style={[styles.row, selected && styles.selectedRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${track.title} by ${track.artist}`}
        onPress={onPress}
        style={({ pressed }) => [styles.track, pressed && styles.pressed]}
      >
        <Artwork track={track} />
        <View style={styles.metadata}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.title, selected && styles.selected]}
          >
            {track.title}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.subtitle}>
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
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  primaryText: { color: '#00171F', fontWeight: '600' },
  button: {
    flexShrink: 1,
    backgroundColor: '#101B20',
    borderRadius: 4,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#29414A',
  },
  buttonText: { color: theme.colors.accent, fontSize: 14 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  art: {
    overflow: 'hidden',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeArt: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    height: undefined,
    aspectRatio: 1,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#338098',
  },
  artLetter: { color: '#FFFFFF', fontSize: 38, fontFamily: theme.lightFont },
  largeLetter: { fontSize: 62, color: '#FFFFFF', opacity: 0.85 },
  disc: {
    position: 'absolute',
    width: '84%',
    height: '84%',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#438497',
    backgroundColor: '#09242F',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: 36 }, { translateY: -16 }],
  },
  innerDisc: {
    width: '74%',
    height: '74%',
    borderRadius: 1000,
    borderWidth: 18,
    borderColor: '#103540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spindle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: '#338098',
  },
  artCaption: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 4,
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 3,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#162126',
  },
  selectedRow: { backgroundColor: '#071C23' },
  track: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  metadata: { flex: 1, minWidth: 0, marginLeft: 14 },
  title: {
    fontSize: 18,
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
