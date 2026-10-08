jest.mock('../src/database/libraryRepository', () => ({}));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  PanResponder,
  type PanResponderCallbacks,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import SeekBar, { positionAtTouch } from '../src/components/SeekBar';

test('touch positions clamp to the track bounds and handle unknown duration', () => {
  expect(positionAtTouch(150, 300, 120)).toBe(60);
  expect(positionAtTouch(-10, 300, 120)).toBe(0);
  expect(positionAtTouch(400, 300, 120)).toBe(120);
  expect(positionAtTouch(40, 0, 120)).toBe(0);
  expect(positionAtTouch(40, 300, NaN)).toBe(0);
});

test('drag previews survive playback updates and seek once on release', async () => {
  let gestures!: PanResponderCallbacks;
  const original = PanResponder.create;
  const spy = jest.spyOn(PanResponder, 'create').mockImplementation(config => {
    gestures = config;
    return original(config);
  });
  const seek = jest.fn().mockResolvedValue(undefined);
  const dragging = jest.fn();
  let root!: TestRenderer.ReactTestRenderer;
  const render = (position: number) => (
    <SeekBar
      position={position}
      duration={120}
      onSeek={seek}
      onDraggingChange={dragging}
    />
  );
  const event = (pageX: number, locationX: number) =>
    ({ nativeEvent: { pageX, locationX } } as GestureResponderEvent);
  const state = {} as PanResponderGestureState;
  await act(() => {
    root = TestRenderer.create(render(10));
  });
  const slider = () => root.root.findByProps({ testID: 'seek-slider' });
  await act(() =>
    slider().props.onLayout({ nativeEvent: { layout: { width: 300 } } }),
  );
  const grant = gestures.onPanResponderGrant!;
  const move = gestures.onPanResponderMove!;
  const release = gestures.onPanResponderRelease!;
  await act(() => {
    grant(event(150, 50), state);
  });
  await act(() => {
    move(event(325, 225), state);
  });
  await act(() => {
    root.update(render(11));
  });
  expect(slider().props.accessibilityValue.now).toBe(90);
  expect(seek).not.toHaveBeenCalled();
  await act(async () => {
    release(event(325, 225), state);
    await Promise.resolve();
  });
  expect(seek).toHaveBeenCalledTimes(1);
  expect(seek).toHaveBeenCalledWith(90);
  expect(dragging).toHaveBeenLastCalledWith(false);
  await act(() => root.unmount());
  spy.mockRestore();
});

test('screen-reader seeking clamps to duration and respects disabled state', async () => {
  const seek = jest.fn().mockResolvedValue(undefined);
  let root!: TestRenderer.ReactTestRenderer;
  await act(() => {
    root = TestRenderer.create(
      <SeekBar
        position={115}
        duration={120}
        onSeek={seek}
        onDraggingChange={jest.fn()}
      />,
    );
  });
  await act(async () => {
    root.root
      .findByProps({ testID: 'seek-slider' })
      .props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      });
    await Promise.resolve();
  });
  expect(seek).toHaveBeenLastCalledWith(120);
  await act(() => {
    root.update(
      <SeekBar
        disabled
        position={115}
        duration={120}
        onSeek={seek}
        onDraggingChange={jest.fn()}
      />,
    );
  });
  await act(() =>
    root.root
      .findByProps({ testID: 'seek-slider' })
      .props.onAccessibilityAction({
        nativeEvent: { actionName: 'decrement' },
      }),
  );
  expect(seek).toHaveBeenCalledTimes(1);
  await act(() => root.unmount());
});
