import { usePreferences } from '../src/store/preferencesStore';
import {
  readPreference,
  writePreference,
} from '../src/database/libraryRepository';
import { parseLyrics } from '../src/services/lyrics';
jest.mock('../src/database/libraryRepository', () => ({
  readPreference: jest.fn(),
  writePreference: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks();
  usePreferences.setState({
    accent: 'cyan',
    songGrid: false,
    busy: false,
    error: '',
  });
});
test('saves appearance and restores it on initialization', async () => {
  await usePreferences.getState().update({ accent: 'magenta', songGrid: true });
  expect(writePreference).toHaveBeenCalledWith('appearance', {
    accent: 'magenta',
    songGrid: true,
  });
  usePreferences.setState({ accent: 'cyan', songGrid: false });
  jest
    .mocked(readPreference)
    .mockResolvedValue({ accent: 'magenta', songGrid: true });
  await usePreferences.getState().initialize();
  expect(usePreferences.getState()).toMatchObject({
    accent: 'magenta',
    songGrid: true,
  });
});
test('failed saves roll back the theme and invalid stored accents use cyan', async () => {
  jest.mocked(writePreference).mockRejectedValue(new Error('disk full'));
  await usePreferences.getState().update({ accent: 'lime' });
  expect(usePreferences.getState()).toMatchObject({
    accent: 'cyan',
    busy: false,
  });
  expect(usePreferences.getState().error).toContain('Could not save');
  jest
    .mocked(readPreference)
    .mockResolvedValue({ accent: 'constructor', songGrid: 'yes' });
  await usePreferences.getState().initialize();
  expect(usePreferences.getState()).toMatchObject({
    accent: 'cyan',
    songGrid: false,
  });
});
test('LRC parser handles repeated timestamps, fractions and malformed tags', () => {
  expect(
    parseLyrics(
      '[ar:Artist]\n[01:02.50][00:03.005]Chorus\n[00:99]Bad\n[00:01]Intro',
    ),
  ).toEqual([
    { time: 1, text: 'Intro' },
    { time: 3.005, text: 'Chorus' },
    { time: 62.5, text: 'Chorus' },
  ]);
  expect(parseLyrics('Plain lyrics')).toEqual([]);
});
