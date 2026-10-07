import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) {
          setReduced(value);
        }
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}

export function SlideHeading({ title }: { title: string }) {
  const reduced = useReducedMotion();
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    offset.setValue(reduced ? 0 : 56);
    const motion = Animated.timing(offset, {
      toValue: 0,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    if (!reduced) {
      motion.start();
    }
    return () => motion.stop();
  }, [title, reduced, offset]);
  return (
    <View style={local.clip}>
      <Animated.Text
        accessibilityRole="header"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[local.title, { transform: [{ translateX: offset }] }]}
      >
        {title}
      </Animated.Text>
    </View>
  );
}

export function SlidePanel({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    offset.setValue(reduced ? 0 : 100);
    const motion = Animated.timing(offset, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    if (!reduced) {
      motion.start();
    }
    return () => motion.stop();
  }, [offset, reduced]);
  return (
    <Animated.View
      style={[local.panel, { transform: [{ translateX: offset }] }]}
    >
      {children}
    </Animated.View>
  );
}

export function MetroHeader({
  navigation,
  options,
  back,
}: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[local.header, { paddingTop: insets.top }]}>
      <View style={local.top}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={navigation.goBack}
            style={local.back}
          >
            <Text style={local.backText}>‹</Text>
          </Pressable>
        )}
        <Text style={local.brand}>MUSIC</Text>
      </View>
      <SlideHeading title={options.title ?? 'music'} />
    </View>
  );
}
const local = StyleSheet.create({
  panel: { flex: 1 },
  header: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: 12 },
  brand: { color: '#FFFFFF', fontSize: 12, letterSpacing: 2 },
  back: { minHeight: 48, minWidth: 48, justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontSize: 36, lineHeight: 40 },
  clip: { overflow: 'hidden' },
  title: {
    color: '#FFFFFF',
    fontFamily: theme.lightFont,
    fontSize: 52,
    paddingBottom: 8,
  },
});
