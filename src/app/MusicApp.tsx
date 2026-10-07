import React, { useEffect, useState } from 'react';
import { MetroHeader, useReducedMotion } from '../components/MetroMotion';
import MiniPlayer from '../components/MiniPlayer';
import { AppState, View } from 'react-native';
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
export default function MusicApp() {
  const reducedMotion = useReducedMotion();
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
            header: MetroHeader,
            animation: reducedMotion ? 'none' : 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Collection"
            component={LibraryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ title: 'now playing' }}
          />
          <Stack.Screen
            name="Queue"
            component={QueueScreen}
            options={{ title: 'up next' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'settings' }}
          />
        </Stack.Navigator>
        {currentRoute !== 'Player' && currentRoute !== 'Collection' && (
          <SafeAreaView edges={['bottom']}>
            <MiniPlayer onOpen={() => navigation.navigate('Player')} />
          </SafeAreaView>
        )}
      </View>
    </NavigationContainer>
  );
}
