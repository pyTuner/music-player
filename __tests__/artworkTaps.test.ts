import { tapSeekSeconds } from '../src/services/artworkTaps';
test('single side taps do nothing; repeated taps increase seek up to thirty seconds', () => {
  expect([1, 2, 3, 4, 5, 6].map(tapSeekSeconds)).toEqual([
    0, 5, 10, 15, 30, 30,
  ]);
});
