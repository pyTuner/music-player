import React, { useEffect, useState } from 'react';
import MarqueeTitle from '../components/MarqueeTitle';
import { Artwork } from '../components/MusicElements';
import TransportButton from '../components/TransportButton';
import { AppState, Pressable, Text, View } from 'react-native';
import {
  DarkTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import LibraryScreen from '../features/library/LibraryScreen';
import PlayerScreen from '../features/player/PlayerScreen';
import QueueScreen from '../features/queue/QueueScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { styles } from '../theme/styles';
import { theme } from '../theme/theme';
import type { Routes } from './navigation';

const Stack = createNativeStackNavigator<Routes>();
const navigation = createNavigationContainerRef<Routes>();
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    primary: theme.colors.accent,
  },
};
function SettingsButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      style={styles.transport}
      onPress={() => navigation.navigate('Settings')}
    >
      <Text style={styles.accent}>···</Text>
    </Pressable>
  );
}
export default function MusicApp() {
  const [currentRoute, setCurrentRoute] = useState('Collection');
  useEffect(() => {
    useLibraryStore.getState().initialize();
    usePlayerStore.getState().restore();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') {
        useLibraryStore.getState().scan();
        usePlayerStore.getState().refresh();
      }
    });
    // UI observation only: queue advancement and all audio timing remain native.
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        usePlayerStore.getState().refresh();
      }
    }, 1000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, []);
  return (
    <NavigationContainer
      ref={navigation}
      theme={navigationTheme}
      onStateChange={() =>
        setCurrentRoute(navigation.getCurrentRoute()?.name ?? 'Collection')
      }
    >
      <View style={styles.root}>
        <Stack.Navigator
          screenOptions={{
            headerShadowVisible: false,
            headerTintColor: '#FFFFFF',
            headerStyle: { backgroundColor: '#000000' },
            headerRight: SettingsButton,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Collection"
            component={LibraryScreen}
            options={{ title: 'MUSIC / COLLECTION' }}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ title: 'NOW PLAYING' }}
          />
          <Stack.Screen
            name="Queue"
            component={QueueScreen}
            options={{ title: 'YOUR QUEUE' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'SETTINGS' }}
          />
        </Stack.Navigator>
        {currentRoute !== 'Player' && <MiniPlayer />}
      </View>
    </NavigationContainer>
  );
}
function MiniPlayer() {
  const player = usePlayerStore();
  const track = player.queue.find(item => item.id === player.status.trackId);
  return (
    <SafeAreaView edges={['bottom']}>
      {track && (
        <View style={styles.mini}>
          <Artwork track={track} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${track.title}`}
            style={styles.flex}
            onPress={() => navigation.navigate('Player')}
          >
            <MarqueeTitle key={track.id} title={track.title} />
            <Text style={styles.muted} numberOfLines={1}>
              {track.artist}
            </Text>
          </Pressable>
          <TransportButton
            kind={player.status.playing ? 'pause' : 'play'}
            label={player.status.playing ? 'Pause' : 'Play'}
            disabled={player.busy}
            onPress={() =>
              player.command(player.status.playing ? 'pause' : 'play')
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}
