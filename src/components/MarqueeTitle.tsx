import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme/theme';

export default function MarqueeTitle({ title }: { title: string }) {
  const offset = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) {
          setReduceMotion(value);
        }
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    const state = AppState.addEventListener('change', value =>
      setForeground(value === 'active'),
    );
    return () => {
      alive = false;
      motion.remove();
      state.remove();
    };
  }, []);
  const overflow = textWidth > containerWidth && containerWidth > 0;
  useEffect(() => {
    offset.setValue(0);
    if (!overflow || reduceMotion || !foreground) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(offset, {
          toValue: -(textWidth + 36),
          duration: ((textWidth + 36) / 28) * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [title, overflow, reduceMotion, foreground, textWidth, offset]);
  return (
    <View
      accessible
      accessibilityLabel={title}
      style={styles.clip}
      onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        key={title}
        horizontal
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.measure}
        onContentSizeChange={width => setTextWidth(width)}
      >
        <Text style={styles.text} numberOfLines={1}>
          {title}
        </Text>
      </ScrollView>
      {overflow && !reduceMotion ? (
        <Animated.View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.ticker,
            { width: textWidth * 2 + 72, transform: [{ translateX: offset }] },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.text, styles.gap, { width: textWidth }]}
          >
            {title}
          </Text>
          <Text numberOfLines={1} style={[styles.text, { width: textWidth }]}>
            {title}
          </Text>
        </Animated.View>
      ) : (
        <Text
          accessible={false}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.text}
        >
          {title}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  gap: { marginRight: 36 },
  clip: { overflow: 'hidden', minWidth: 0 },
  text: { color: theme.colors.foreground, fontSize: 16, lineHeight: 24 },
  measure: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  ticker: { flexDirection: 'row' },
});
