import { accents, usePreferences } from '../../store/preferencesStore';
import { useThemedStyles } from '../../theme/useThemedStyles';
import React from 'react';
import {
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { TextButton } from '../../components/MusicElements';
import { useLibraryStore } from '../../store/libraryStore';
import { usePlayerStore } from '../../store/playerStore';
import { styles as baseStyles } from '../../theme/styles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const styles = useThemedStyles(baseStyles);
  const preferences = usePreferences();
  const library = useLibraryStore();
  const crossfade = usePlayerStore(state => state.status.crossfadeSeconds ?? 0);
  const playbackBusy = usePlayerStore(state => state.busy);
  const playbackError = usePlayerStore(state => state.error);
  return (
    <SafeAreaView edges={['bottom']} style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Lumia, in spirit</Text>
        <Text style={styles.muted}>
          Clear type, a black canvas, and your own accent colour. A listening
          space with its own identity.
        </Text>
        <Text style={styles.heading}>accent colour</Text>
        <View style={styles.row}>
          {Object.entries(accents).map(([name, color]) => (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityState={{
                checked: preferences.accent === name,
                disabled: preferences.busy,
              }}
              disabled={preferences.busy}
              onPress={() =>
                preferences.update({ accent: name as keyof typeof accents })
              }
              style={[
                local.swatch,
                { backgroundColor: color },
                preferences.accent === name && local.selected,
              ]}
            >
              <Text style={local.swatchLabel}>{name}</Text>
            </Pressable>
          ))}
        </View>
        {!!preferences.error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {preferences.error}
          </Text>
        )}
        <Text style={styles.heading}>local library</Text>
        {Platform.OS === 'android' && (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.text}>include recordings</Text>
              <Text style={styles.muted}>
                Off by default. Show all device audio if a song is missing.
                Files you explicitly import are always included.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Include recordings"
              disabled={library.busy}
              value={library.includeRecordings}
              onValueChange={library.setIncludeRecordings}
              trackColor={{
                false: '#333333',
                true: accents[preferences.accent],
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}
        <Text style={styles.muted}>
          {Platform.OS === 'android'
            ? 'Audio indexed by Android loads automatically with permission. Import from Files for audio in other locations.'
            : 'Audio imported from Files is stored in this app. iOS does not allow scanning every folder or other apps’ private libraries.'}
        </Text>
        <View style={styles.row}>
          <TextButton
            label="scan library"
            disabled={library.busy}
            onPress={() => library.scan(true)}
          />
          <TextButton
            label="import audio"
            disabled={library.busy}
            onPress={() => library.importFiles()}
          />
        </View>
        {!!library.error && <Text style={styles.error}>{library.error}</Text>}
        <Text style={styles.heading}>saved on your device</Text>
        <Text style={styles.muted}>
          Your library metadata, favorites, and queue are stored locally. No
          account or server is required.
        </Text>
        <Text style={styles.heading}>transitions</Text>
        <Text style={styles.text}>crossfade</Text>
        <Text style={styles.muted}>
          Blend the end of a song into the next. Short songs use a shorter fade.
          Repeat one keeps looping the same song without a crossfade.
        </Text>
        <Text style={styles.muted}>
          Crossfade plays slightly quieter to leave room for both songs without
          distortion.
        </Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {[0, 2, 4, 6, 8, 12].map(seconds => (
            <Pressable
              key={seconds}
              accessibilityRole="radio"
              accessibilityLabel={
                seconds === 0 ? 'Crossfade off' : `Crossfade ${seconds} seconds`
              }
              accessibilityState={{
                checked: crossfade === seconds,
                disabled: playbackBusy,
              }}
              disabled={playbackBusy}
              onPress={() => usePlayerStore.getState().setCrossfade(seconds)}
              style={[
                local.duration,
                crossfade === seconds && {
                  borderColor: accents[preferences.accent],
                },
              ]}
            >
              <Text
                style={[
                  styles.text,
                  crossfade === seconds && {
                    color: accents[preferences.accent],
                  },
                ]}
              >
                {seconds === 0 ? 'off' : `${seconds}s`}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!playbackError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {playbackError}
          </Text>
        )}
        <Text style={styles.muted}>
          Beat matching and automatic transition-point selection are coming
          later.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  duration: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 88,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { borderWidth: 3, borderColor: '#FFFFFF' },
  swatchLabel: { color: '#000000', fontSize: 14 },
});
