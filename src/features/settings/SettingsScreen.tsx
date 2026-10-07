import React from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { TextButton } from '../../components/MusicElements';
import { useLibraryStore } from '../../store/libraryStore';
import { styles } from '../../theme/styles';

export default function SettingsScreen() {
  const library = useLibraryStore();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>your preferences</Text>
      <Text style={styles.heading}>Lumia, in spirit</Text>
      <Text style={styles.muted}>
        Clear type, a black canvas, and electric cyan. A listening space with
        its own identity.
      </Text>
      <Text style={styles.heading}>local library</Text>
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
  );
}
