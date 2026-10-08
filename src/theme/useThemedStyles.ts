import { useMemo } from 'react';
import { useAccent } from '../store/preferencesStore';
// Preserve immutable style sheets while updating every existing accent surface.
export function useThemedStyles<T extends object>(base: T): T {
  const accent = useAccent();
  return useMemo(() => {
    const colors: Record<string, string> = {
      '#00B7E8': accent,
      '#07566D': `${accent}66`,
      '#0A161C': `${accent}12`,
      '#071C23': `${accent}18`,
      '#0B232C': `${accent}22`,
      '#101B20': `${accent}12`,
      '#29414A': `${accent}55`,
      '#338098': `${accent}88`,
      '#438497': `${accent}66`,
      '#09242F': `${accent}18`,
      '#103540': `${accent}22`,
    };
    return Object.fromEntries(
      Object.entries(base).map(([name, style]) => [
        name,
        Object.fromEntries(
          Object.entries(style).map(([key, value]) => [
            key,
            typeof value === 'string' ? colors[value] ?? value : value,
          ]),
        ),
      ]),
    ) as T;
  }, [base, accent]);
}
