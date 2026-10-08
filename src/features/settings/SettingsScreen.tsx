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
import { styles as baseStyles } from '../../theme/styles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const styles = useThemedStyles(baseStyles);
  const preferences = usePreferences();
  const library = useLibraryStore();
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
                Off by default. Show all device audio if a song is missing. Files
                you explicitly import are always included.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Include recordings"
              disabled={library.busy}
              value={library.includeRecordings}
              onValueChange={library.setIncludeRecordings}
              trackColor={{ false: '#333333', true: accents[preferences.accent] }}
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
        <Text style={styles.muted}>
          Standard queued playback is available. Beat matching, waveform analysis,
          bass swapping, and the Transition Lab are still under development.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  swatch: {
    width: 88,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { borderWidth: 3, borderColor: '#FFFFFF' },
  swatchLabel: { color: '#000000', fontSize: 14 },
});
