/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar } from 'react-native';
import MusicApp from './src/app/MusicApp';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <MusicApp />
    </SafeAreaProvider>
  );
}

export default App;
