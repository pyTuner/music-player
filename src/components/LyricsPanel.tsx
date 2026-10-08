import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { readPreference, writePreference } from '../database/libraryRepository';
import { parseLyrics } from '../services/lyrics';
import { TextButton } from './MusicElements';
import { useAccent } from '../store/preferencesStore';
import { theme } from '../theme/theme';
export default function LyricsPanel({
  trackId,
  title,
  position,
  onClose,
}: {
  trackId: string;
  title: string;
  position: number;
  onClose: () => void;
}) {
  const accent = useAccent();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    readPreference<string>(`lyrics:${trackId}`, '')
      .then(value => {
        if (live) {
          setText(typeof value === 'string' ? value : '');
        }
      })
      .catch(() => {
        if (live) {
          setError('Could not load saved lyrics.');
        }
      })
      .finally(() => {
        if (live) {
          setBusy(false);
        }
      });
    return () => {
      live = false;
    };
  }, [trackId]);
  const lines = useMemo(() => parseLyrics(text), [text]);
  let active = -1;
  lines.forEach((line, index) => {
    if (line.time <= position) {
      active = index;
    }
  });
  return (
    <Modal onRequestClose={onClose} animationType="fade">
      <SafeAreaView style={local.root}>
        <KeyboardAvoidingView behavior="height" style={local.root}>
          <Text style={local.heading}>lyrics</Text>
          <Text numberOfLines={1} style={local.subtitle}>
            {title}
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={local.error}>
              {error}
            </Text>
          ) : null}
          {editing ? (
            <TextInput
              accessibilityLabel="Song lyrics"
              multiline
              value={draft}
              onChangeText={setDraft}
              maxLength={100000}
              style={local.input}
              placeholder="Paste plain text or timestamped LRC lyrics"
              placeholderTextColor="#888888"
              textAlignVertical="top"
            />
          ) : (
            <ScrollView
              style={local.root}
              contentContainerStyle={local.reading}
            >
              {lines.length ? (
                lines.map((line, i) => (
                  <Text
                    key={i}
                    style={[local.line, i === active && { color: accent }]}
                  >
                    {line.text || '♪'}
                  </Text>
                ))
              ) : (
                <Text style={local.line}>
                  {busy
                    ? 'loading…'
                    : text ||
                      'No lyrics saved for this song. Add plain text or LRC lyrics to read along offline.'}
                </Text>
              )}
            </ScrollView>
          )}
          <View style={local.actions}>
            <TextButton
              label={
                editing ? 'save lyrics' : text ? 'edit lyrics' : 'add lyrics'
              }
              disabled={busy}
              onPress={async () => {
                if (!editing) {
                  setDraft(text);
                  setEditing(true);
                  return;
                }
                setBusy(true);
                setError('');
                try {
                  await writePreference(`lyrics:${trackId}`, draft);
                  setText(draft);
                  setEditing(false);
                } catch {
                  setError(
                    'Could not save lyrics. Your text is still here; try again.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            <TextButton
              label={editing ? 'cancel' : 'close'}
              disabled={busy}
              onPress={() => (editing ? setEditing(false) : onClose())}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  heading: {
    fontFamily: theme.lightFont,
    fontSize: 52,
    color: '#FFFFFF',
    paddingHorizontal: 24,
  },
  subtitle: { color: '#AAAAAA', paddingHorizontal: 24, paddingBottom: 16 },
  reading: { padding: 24 },
  line: {
    fontFamily: theme.lightFont,
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 38,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 19,
    margin: 24,
    padding: 12,
    backgroundColor: '#181818',
  },
  actions: { flexDirection: 'row', gap: 16, padding: 24 },
  error: { color: '#FFBCAB', paddingHorizontal: 24 },
});
