import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type Routes = {
  Collection: undefined;
  Player: undefined;
  Queue: undefined;
  Settings: undefined;
};
export type ScreenProps<T extends keyof Routes> = NativeStackScreenProps<
  Routes,
  T
>;
