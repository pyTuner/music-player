import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { useReducedMotion } from './MetroMotion';

// Native gesture events feed a native Animated graph; JS only decides at release.
export default function PlayerDrag({
  children,
  direction,
  onComplete,
  disabled = false,
  fill = true,
}: {
  children: React.ReactNode;
  direction: 'up' | 'down' | 'right' | 'left';
  onComplete: () => void;
  disabled?: boolean;
  fill?: boolean;
}) {
  const horizontal = direction === 'right' || direction === 'left';
  const { height, width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  const settling = useRef(false);
  const callback = useRef(onComplete);
  callback.current = onComplete;
  useEffect(
    () => () => {
      y.stopAnimation();
    },
    [y],
  );
  const scroll = useMemo(
    () =>
      Animated.event(
        [
          {
            nativeEvent: horizontal ? { translationX: y } : { translationY: y },
          },
        ],
        {
          useNativeDriver: true,
        },
      ),
    [y, horizontal],
  );
  const translateY = useMemo(
    () =>
      direction === 'left'
        ? y.interpolate({
            inputRange: [-width, 0],
            outputRange: [-48, 0],
            extrapolate: 'clamp',
          })
        : direction === 'right'
        ? y.interpolate({
            inputRange: [0, width],
            outputRange: [0, 48],
            extrapolate: 'clamp',
          })
        : direction === 'down'
        ? y.interpolate({
            inputRange: [-height, 0, height],
            outputRange: [0, 0, height],
            extrapolate: 'clamp',
          })
        : y.interpolate({
            inputRange: [-height, 0, height],
            outputRange: [-36, 0, 0],
            extrapolate: 'clamp',
          }),
    [direction, height, width, y],
  );
  const release = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState !== State.ACTIVE || settling.current) {
      return;
    }
    const { state } = event.nativeEvent;
    const translationY = horizontal
      ? event.nativeEvent.translationX
      : event.nativeEvent.translationY;
    const velocityY = horizontal
      ? event.nativeEvent.velocityX
      : event.nativeEvent.velocityY;
    const sign = direction === 'up' || direction === 'left' ? -1 : 1;
    const complete =
      state === State.END &&
      (translationY * sign > (direction === 'down' ? 100 : 40) ||
        (velocityY * sign > 850 && translationY * sign > 18));
    settling.current = true;
    if (complete && direction === 'down') {
      Animated.timing(y, {
        toValue: height,
        duration: reduced
          ? 0
          : Math.max(
              90,
              Math.min(
                220,
                ((height - Math.max(0, translationY)) /
                  Math.max(velocityY, 1600)) *
                  1000,
              ),
            ),
        useNativeDriver: true,
      }).start(({ finished }) => {
        settling.current = false;
        if (finished) {
          callback.current();
        }
      });
    } else {
      Animated.spring(y, {
        toValue: 0,
        stiffness: 300,
        damping: 32,
        mass: 0.8,
        useNativeDriver: true,
      }).start(() => {
        settling.current = false;
      });
      if (complete) {
        callback.current();
      }
    }
  };
  return (
    <PanGestureHandler
      enabled={!disabled}
      activeOffsetY={horizontal ? undefined : direction === 'down' ? 16 : -16}
      activeOffsetX={horizontal ? (direction === 'left' ? -20 : 20) : undefined}
      failOffsetX={horizontal ? undefined : [-24, 24]}
      failOffsetY={horizontal ? [-20, 20] : undefined}
      onGestureEvent={scroll}
      onHandlerStateChange={release}
    >
      <Animated.View
        testID={`player-drag-${direction}`}
        style={[
          direction !== 'up' && fill && local.full,
          {
            transform: horizontal
              ? [{ translateX: reduced ? 0 : translateY }]
              : [{ translateY: reduced ? 0 : translateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
}
const local = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000000' },
});
