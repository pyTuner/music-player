import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  LayoutAnimation,
  UIManager,
  type ListRenderItemInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Icon from '../../components/Icon';
import { Artwork, TextButton } from '../../components/MusicElements';
import PlayerDrag from '../../components/PlayerDrag';
import { MetroHeader, useReducedMotion } from '../../components/MetroMotion';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { useAccent } from '../../store/preferencesStore';
import { styles as baseStyles } from '../../theme/styles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { Track } from '../../types/Track';
import type { ScreenProps } from '../../app/navigation';

export default function QueueScreen({
  navigation,
  route,
}: ScreenProps<'Queue'>) {
  const styles = useThemedStyles(baseStyles);
  const player = usePlayerStore();
  const libraryError = useLibraryStore(state => state.error);
  const [rows, setRows] = useState(player.queue);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragging = dragId !== null;
  const list = useRef<FlatList<Track>>(null);
  const scrollOffset = useRef(0);
  const dragScrollStart = useRef(0);
  const scrollAdjustment = useRef(new Animated.Value(0)).current;
  const listHeight = useRef(0);
  const listTop = useRef(0);
  const listBox = useRef<React.ComponentRef<typeof View>>(null);
  const edgeDirection = useRef(0);
  const dragTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopAutoScroll = () => {
    if (dragTimer.current) clearInterval(dragTimer.current);
    dragTimer.current = null;
    edgeDirection.current = 0;
  };
  useEffect(() => {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
    return stopAutoScroll;
  }, []);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const reduced = useReducedMotion();
  const locked = dragging || saving || player.busy;
  useEffect(() => {
    if (!dragging && !saving) {
      setRows(player.queue);
    }
  }, [player.queue, dragging, saving]);
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(timer);
  }, [notice]);
  const back = () => {
    const routes = navigation.getState().routes;
    if (routes[routes.length - 2]?.name === 'Player') {
      navigation.goBack();
    } else {
      navigation.navigate('Player');
    }
  };
  const finishDrag = async (
    item: Track,
    translation: number,
    cancelled: boolean,
  ) => {
    stopAutoScroll();
    scrollAdjustment.setValue(0);
    setDragId(null);
    if (cancelled) return;
    const from = rows.findIndex(row => row.id === item.id);
    const distance =
      translation + scrollOffset.current - dragScrollStart.current;
    const to = Math.max(
      0,
      Math.min(rows.length - 1, from + Math.round(distance / 96)),
    );
    if (from < 0 || from === to) return;
    const data = [...rows];
    data.splice(from, 1);
    data.splice(to, 0, item);
    if (!reduced)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSaving(true);
    setRows(data);
    await usePlayerStore.getState().reorderQueue(data);
    setRows(usePlayerStore.getState().queue);
    setSaving(false);
  };
  const renderRow = ({ item, index }: ListRenderItemInfo<Track>) => (
    <QueueRow
      track={item}
      index={index}
      active={dragId === item.id}
      scrollAdjustment={scrollAdjustment}
      disabled={saving || player.busy || (dragging && dragId !== item.id)}
      selected={item.id === player.status.trackId}
      onDragStart={() => {
        dragScrollStart.current = scrollOffset.current;
        setDragId(item.id);
        listBox.current?.measureInWindow((_x, y) => {
          listTop.current = y;
        });
        stopAutoScroll();
        dragTimer.current = setInterval(() => {
          if (!edgeDirection.current) return;
          const max = Math.max(0, rows.length * 96 - listHeight.current);
          const offset = Math.max(
            0,
            Math.min(max, scrollOffset.current + edgeDirection.current * 12),
          );
          list.current?.scrollToOffset({ offset, animated: false });
        }, 40);
      }}
      onDragMove={absoluteY => {
        const y = absoluteY - listTop.current;
        edgeDirection.current =
          y < 65 ? -1 : y > listHeight.current - 65 ? 1 : 0;
      }}
      onDragEnd={(translation, cancelled) =>
        finishDrag(item, translation, cancelled)
      }
      onPlay={() => {
        if (dragging) return;
        player.start(item, player.queue);
        back();
      }}
      onRemove={() => player.removeQueueItem(item.id)}
      onFavorite={() => {
        const library = useLibraryStore.getState();
        if (library.favorites.includes(item.id)) {
          setNotice('Already in favorites');
        } else {
          library.toggleFavorite(item.id);
          setNotice('Added to favorites');
        }
      }}
    />
  );
  return (
    <View style={styles.root}>
      <PlayerDrag
        direction="right"
        disabled={locked || menu}
        onComplete={back}
        fill={false}
      >
        <MetroHeader
          navigation={navigation}
          route={route}
          options={{ title: 'up next' }}
          back={{ title: 'now playing', href: undefined }}
        />
        <View style={local.toolbar}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.muted, styles.flex]}
          >
            {notice || 'hold to move · ← remove · favorite →'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Queue options"
            disabled={locked}
            onPress={() => setMenu(true)}
            style={styles.transport}
          >
            <Icon name="more" />
          </Pressable>
        </View>
      </PlayerDrag>
      {!!(player.error || libraryError) && (
        <Text accessibilityRole="alert" style={[styles.error, local.inset]}>
          {player.error || libraryError}
        </Text>
      )}
      <View
        ref={listBox}
        style={styles.flex}
        onLayout={event => {
          listHeight.current = event.nativeEvent.layout.height;
        }}
      >
        <FlatList
          ref={list}
          data={rows}
          keyExtractor={track => track.id}
          renderItem={renderRow}
          extraData={dragId}
          scrollEnabled={!dragging}
          removeClippedSubviews={false}
          CellRendererComponent={QueueCell}
          onScroll={event => {
            scrollOffset.current = event.nativeEvent.contentOffset.y;
            if (dragging)
              scrollAdjustment.setValue(
                scrollOffset.current - dragScrollStart.current,
              );
          }}
          scrollEventThrottle={16}
          contentContainerStyle={local.list}
          ListFooterComponent={
            <PlayerDrag
              direction="right"
              onComplete={back}
              disabled={locked}
              fill={false}
            >
              <View style={local.emptySpace} />
            </PlayerDrag>
          }
          ListEmptyComponent={
            <Text style={styles.heading}>Your queue is empty.</Text>
          }
        />
      </View>
      <Modal
        visible={menu}
        transparent
        animationType={reduced ? 'none' : 'slide'}
        onRequestClose={() => setMenu(false)}
      >
        <View style={local.modal}>
          <Pressable
            style={styles.flex}
            accessibilityRole="button"
            accessibilityLabel="Close queue options"
            onPress={() => setMenu(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            style={local.sheet}
            accessibilityViewIsModal
          >
            <Text style={styles.heading}>queue options</Text>
            <Text style={styles.muted}>
              Clearing the queue also stops playback.
            </Text>
            <View style={styles.row}>
              <TextButton
                label="clear queue"
                disabled={!rows.length || locked}
                onPress={() => {
                  setMenu(false);
                  player.changeQueue([]);
                }}
              />
              <TextButton label="close" onPress={() => setMenu(false)} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
function QueueRow({
  track,
  index,
  active,
  scrollAdjustment,
  selected,
  disabled,
  onDragStart,
  onDragMove,
  onDragEnd,
  onPlay,
  onRemove,
  onFavorite,
}: {
  track: Track;
  index: number;
  active: boolean;
  scrollAdjustment: Animated.Value;
  selected: boolean;
  disabled: boolean;
  onDragStart: () => void;
  onDragMove: (absoluteY: number) => void;
  onDragEnd: (translation: number, cancelled: boolean) => void;
  onPlay: () => void;
  onRemove: () => void;
  onFavorite: () => void;
}) {
  const accent = useAccent();
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const dragActive = useRef(false);
  const finish = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) {
      return;
    }
    const { state, translationX } = event.nativeEvent;
    Animated.spring(x, {
      toValue: 0,
      stiffness: 300,
      damping: 30,
      useNativeDriver: true,
    }).start();
    if (state === State.END && !disabled) {
      if (translationX < -90) {
        onRemove();
      } else if (translationX > 90) {
        onFavorite();
      }
    }
  };
  useEffect(() => () => x.stopAnimation(), [x]);
  return (
    <View style={[local.rowClip, active && local.draggingRow]}>
      <View
        style={[local.actions, active && local.hiddenActions]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[local.reveal, { backgroundColor: accent }]}>
          <Icon name="heart" color="#000000" />
          <Text style={local.revealText}>favorite</Text>
        </View>
        <View style={[local.reveal, local.removeReveal]}>
          <Icon name="trash" />
          <Text style={local.white}>remove</Text>
        </View>
      </View>
      <Animated.View
        style={[
          local.row,
          active && local.activeRow,
          active && { borderColor: accent },
          {
            transform: [
              { translateX: x },
              { translateY: active ? Animated.add(y, scrollAdjustment) : y },
            ],
          },
        ]}
      >
        <PanGestureHandler
          enabled={!disabled}
          activeOffsetX={[-16, 16]}
          failOffsetY={[-12, 12]}
          onGestureEvent={Animated.event(
            [{ nativeEvent: { translationX: x } }],
            {
              useNativeDriver: true,
            },
          )}
          onHandlerStateChange={finish}
        >
          <Animated.View style={local.songTouch}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play ${track.title}`}
              accessibilityHint="Swipe left to remove, right to favorite. Use the drag handle to reorder."
              accessibilityActions={[
                { name: 'moveUp', label: 'Move up' },
                { name: 'moveDown', label: 'Move down' },
                { name: 'remove', label: 'Remove from queue' },
                { name: 'favorite', label: 'Add to favorites' },
              ]}
              onAccessibilityAction={event => {
                if (disabled) {
                  return;
                }
                const name = event.nativeEvent.actionName;
                if (name === 'moveUp' || name === 'moveDown') {
                  usePlayerStore
                    .getState()
                    .moveQueueItem(track.id, name === 'moveUp' ? -1 : 1);
                } else if (name === 'remove') {
                  onRemove();
                } else if (name === 'favorite') {
                  onFavorite();
                }
              }}
              disabled={disabled}
              onPress={onPlay}
              style={local.song}
            >
              <Artwork track={track} />
              <View style={local.metadata}>
                <Text
                  numberOfLines={1}
                  style={[local.title, selected && { color: accent }]}
                >
                  {track.title}
                </Text>
                <Text numberOfLines={1} style={local.subtitle}>
                  {selected ? 'now playing · ' : `${index + 1} · `}
                  {track.artist}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </PanGestureHandler>
        <PanGestureHandler
          enabled={!disabled}
          activateAfterLongPress={200}
          onGestureEvent={Animated.event(
            [{ nativeEvent: { translationY: y } }],
            {
              useNativeDriver: true,
              listener: (event: { nativeEvent: { absoluteY: number } }) =>
                onDragMove(event.nativeEvent.absoluteY),
            },
          )}
          onHandlerStateChange={event => {
            const { state, oldState, translationY } = event.nativeEvent;
            if (state === State.ACTIVE) {
              dragActive.current = true;
              onDragStart();
            } else if (oldState === State.ACTIVE && dragActive.current) {
              dragActive.current = false;
              y.setValue(0);
              onDragEnd(translationY, state !== State.END);
            }
          }}
        >
          <Animated.View
            accessible
            accessibilityLabel={`Drag ${track.title}`}
            accessibilityHint="Hold then move up or down"
            style={local.handle}
          >
            <Icon name="grip" color={accent} />
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </View>
  );
}
function QueueCell({
  children,
  style,
  onLayout,
}: React.ComponentProps<
  NonNullable<
    React.ComponentProps<typeof FlatList<Track>>['CellRendererComponent']
  >
>) {
  const child = React.Children.toArray(children)[0] as
    | React.ReactElement<{ active?: boolean }>
    | undefined;
  return (
    <View
      onLayout={onLayout}
      style={[style, child?.props.active && local.draggingRow]}
    >
      {children}
    </View>
  );
}
const local = StyleSheet.create({
  inset: { paddingHorizontal: 24 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  list: { paddingHorizontal: 16 },
  rowClip: { overflow: 'visible' },
  draggingRow: { zIndex: 10, elevation: 8 },
  hiddenActions: { opacity: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    height: 96,
    borderBottomWidth: 1,
    borderColor: '#222222',
  },
  activeRow: { backgroundColor: '#151515' },
  songTouch: { flex: 1, height: 96 },
  song: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  metadata: { flex: 1, minWidth: 0, marginLeft: 12 },
  title: { color: '#FFFFFF', fontFamily: 'sans-serif-light', fontSize: 21 },
  subtitle: { color: '#AAAAAA', fontSize: 13, marginTop: 5 },
  handle: {
    minWidth: 48,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reveal: {
    width: '50%',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 4,
  },
  removeReveal: { alignItems: 'flex-end', backgroundColor: '#832626' },
  revealText: { color: '#000000' },
  white: { color: '#FFFFFF' },
  emptySpace: { minHeight: 140 },
  modal: { flex: 1, backgroundColor: '#00000088' },
  sheet: { backgroundColor: '#202020', paddingHorizontal: 24 },
});
