import React from 'react';
import Svg, { Path } from 'react-native-svg';
const paths = {
  shuffle:
    'M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4',
  repeat:
    'm17 2 4 4-4 4M21 6H7a4 4 0 0 0-4 4m4 12-4-4 4-4M3 18h14a4 4 0 0 0 4-4',
  repeatOne:
    'm17 2 4 4-4 4M21 6H7a4 4 0 0 0-4 4m4 12-4-4 4-4M3 18h14a4 4 0 0 0 4-4M10 11l2-2v6m-2 0h4',

  grip: 'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  up: 'm5 15 7-7 7 7',
  down: 'm5 9 7 7 7-7',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  list: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
  lyrics: 'M4 3h16v18H4ZM8 7h8M8 11h8M8 15h5',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  close: 'M5 5l14 14M19 5 5 19',
  play: 'm7 3 14 9-14 9Z',
  more: 'M4 12h.01M12 12h.01M20 12h.01',
};
export default function Icon({
  name,
  color = '#FFFFFF',
  size = 24,
  filled = false,
}: {
  name: keyof typeof paths;
  color?: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={paths[name]}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={name === 'more' ? 3 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
