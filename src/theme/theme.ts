import { Platform } from 'react-native';

export const theme = {
  colors: {
    background: '#000000',
    surface: '#161616',
    foreground: '#FFFFFF',
    secondary: '#A6A6A6',
    accent: '#00B7E8',
    divider: '#303030',
  },
  lightFont: Platform.select({
    ios: 'HelveticaNeue-Light',
    android: 'sans-serif-light',
  }),
};
