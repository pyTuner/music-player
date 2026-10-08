export function tapSeekSeconds(count: number) {
  return count < 2
    ? 0
    : count === 2
    ? 5
    : count === 3
    ? 10
    : count === 4
    ? 15
    : 30;
}
