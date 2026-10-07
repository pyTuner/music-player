import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme/theme';

export default function TransportButton({
  kind,
  label,
  disabled = false,
  primary = false,
  onPress,
}: {
  kind: 'play' | 'pause' | 'next' | 'previous';
  label: string;
  disabled?: boolean;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.icon, kind === 'previous' && styles.reverse]}
      >
        {kind === 'pause' ? (
          <>
            <View style={styles.pause} />
            <View style={styles.pause} />
          </>
        ) : (
          <>
            <View style={styles.triangle} />
            {kind !== 'play' && <View style={styles.bar} />}
          </>
        )}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#384045',
  },
  primary: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  pressed: { opacity: 0.65, transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.35 },
  icon: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reverse: { transform: [{ rotate: '180deg' }] },
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  pause: { width: 5, height: 22, backgroundColor: '#FFFFFF' },
  bar: { width: 3, height: 22, backgroundColor: '#FFFFFF' },
});
