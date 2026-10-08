export function parseLyrics(text: string) {
  const lines: { time: number; text: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const tags = [...line.matchAll(/\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const words = line.replace(/\[\d+:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    for (const tag of tags) {
      if (Number(tag[2]) < 60) {
        lines.push({
          time:
            Number(tag[1]) * 60 + Number(tag[2]) + Number(`0.${tag[3] ?? 0}`),
          text: words,
        });
      }
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
