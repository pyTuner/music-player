import { open, type DB } from '@op-engineering/op-sqlite';
import type { Track } from '../types/Track';

let database: DB | undefined;
let initialization: Promise<DB> | undefined;
export function getDatabase(): Promise<DB> {
  if (!initialization) {
    initialization = (async () => {
      database = open({ name: 'music.sqlite' });
      await database.execute(
        'CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, uri TEXT NOT NULL, title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT NOT NULL, duration REAL NOT NULL, color TEXT NOT NULL)',
      );
      await database.execute(
        'CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
      );
      await database.execute('PRAGMA user_version = 1');
      return database;
    })().catch(error => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

export async function loadTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM tracks ORDER BY title COLLATE NOCASE',
  );
  return result.rows.map(row => ({
    id: String(row.id),
    uri: String(row.uri),
    title: String(row.title),
    artist: String(row.artist),
    album: String(row.album),
    duration: Number(row.duration),
    color: String(row.color),
  }));
}

// Replace only after a successful, complete native scan. Never erase cache on a scan error.
export async function saveTracks(tracks: Track[]) {
  const db = await getDatabase();
  await db.transaction(async tx => {
    await tx.execute('DELETE FROM tracks');
    for (const track of tracks) {
      await tx.execute(
        'INSERT OR REPLACE INTO tracks VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          track.id,
          track.uri,
          track.title,
          track.artist,
          track.album,
          track.duration,
          track.color,
        ],
      );
    }
  });
}
export async function readPreference<T>(key: string, fallback: T): Promise<T> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT value FROM preferences WHERE key = ?',
    [key],
  );
  try {
    return result.rows.length
      ? JSON.parse(String(result.rows[0].value))
      : fallback;
  } catch {
    return fallback;
  }
}
export async function writePreference(key: string, value: unknown) {
  const db = await getDatabase();
  await db.execute('INSERT OR REPLACE INTO preferences VALUES (?, ?)', [
    key,
    JSON.stringify(value),
  ]);
}
