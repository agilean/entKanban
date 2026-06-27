import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DiceRollLogEntry } from '@kanban-game/engine';
import type { GameSessionState } from '@kanban-game/engine';

export type ReplayDatabase = DatabaseSync;

export type GameSessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  current_day: number;
  phase: string;
  session_json: string;
};

export type DiceRollRow = {
  id: number;
  session_id: string;
  day: number;
  recorded_at: string;
  assignments_json: string;
  steps_json: string;
};

export type ReplayPayload = {
  sessionId: string;
  session: GameSessionState;
  diceRolls: DiceRollLogEntry[];
  createdAt: string;
  updatedAt: string;
};

export type SessionSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  currentDay: number;
  phase: string;
  diceRollCount: number;
};

export function defaultDbPath(): string {
  return resolve(process.env.KANBAN_DB_PATH ?? 'data/kanban-replay.db');
}

export function openDatabase(dbPath = defaultDbPath()): ReplayDatabase {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: ReplayDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      current_day INTEGER NOT NULL,
      phase TEXT NOT NULL,
      session_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dice_roll_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      day INTEGER NOT NULL,
      recorded_at TEXT NOT NULL,
      assignments_json TEXT NOT NULL,
      steps_json TEXT NOT NULL,
      UNIQUE(session_id, day, recorded_at)
    );

    CREATE INDEX IF NOT EXISTS idx_dice_roll_session ON dice_roll_entries(session_id);
    CREATE INDEX IF NOT EXISTS idx_dice_roll_day ON dice_roll_entries(day);
  `);
}

export function upsertSession(db: ReplayDatabase, id: string, session: GameSessionState): void {
  const now = new Date().toISOString();
  const existing = db
    .prepare('SELECT id FROM game_sessions WHERE id = ?')
    .get(id) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE game_sessions
       SET updated_at = ?, current_day = ?, phase = ?, session_json = ?
       WHERE id = ?`,
    ).run(now, session.currentDay, session.phase, JSON.stringify(session), id);
    return;
  }

  db.prepare(
    `INSERT INTO game_sessions (id, created_at, updated_at, current_day, phase, session_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, now, now, session.currentDay, session.phase, JSON.stringify(session));
}

export function insertDiceRollEntry(
  db: ReplayDatabase,
  sessionId: string,
  entry: DiceRollLogEntry,
): boolean {
  upsertSessionPlaceholder(db, sessionId);
  const result = db.prepare(
    `INSERT OR IGNORE INTO dice_roll_entries
      (session_id, day, recorded_at, assignments_json, steps_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    entry.day,
    entry.recordedAt,
    JSON.stringify(entry.assignments),
    JSON.stringify(entry.steps),
  );
  return result.changes > 0;
}

function upsertSessionPlaceholder(db: ReplayDatabase, sessionId: string): void {
  const existing = db
    .prepare('SELECT id FROM game_sessions WHERE id = ?')
    .get(sessionId) as { id: string } | undefined;
  if (existing) {
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO game_sessions (id, created_at, updated_at, current_day, phase, session_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(sessionId, now, now, 9, 'REPLENISH', '{}');
}

export function listSessions(db: ReplayDatabase, limit = 50): SessionSummary[] {
  const rows = db
    .prepare(
      `SELECT
         s.id,
         s.created_at AS createdAt,
         s.updated_at AS updatedAt,
         s.current_day AS currentDay,
         s.phase,
         COUNT(d.id) AS diceRollCount
       FROM game_sessions s
       LEFT JOIN dice_roll_entries d ON d.session_id = s.id
       GROUP BY s.id
       ORDER BY s.updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    currentDay: number;
    phase: string;
    diceRollCount: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currentDay: row.currentDay,
    phase: row.phase,
    diceRollCount: row.diceRollCount,
  }));
}

export function getReplay(db: ReplayDatabase, sessionId: string): ReplayPayload | null {
  const row = db
    .prepare('SELECT * FROM game_sessions WHERE id = ?')
    .get(sessionId) as GameSessionRow | undefined;
  if (!row) {
    return null;
  }

  const diceRows = db
    .prepare(
      `SELECT * FROM dice_roll_entries
       WHERE session_id = ?
       ORDER BY day ASC, recorded_at ASC`,
    )
    .all(sessionId) as DiceRollRow[];

  return {
    sessionId: row.id,
    session: JSON.parse(row.session_json) as GameSessionState,
    diceRolls: diceRows.map(parseDiceRollRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listDiceRolls(db: ReplayDatabase, sessionId: string): DiceRollLogEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM dice_roll_entries
       WHERE session_id = ?
       ORDER BY day ASC, recorded_at ASC`,
    )
    .all(sessionId) as DiceRollRow[];
  return rows.map(parseDiceRollRow);
}

function parseDiceRollRow(row: DiceRollRow): DiceRollLogEntry {
  return {
    day: row.day,
    recordedAt: row.recorded_at,
    assignments: JSON.parse(row.assignments_json),
    steps: JSON.parse(row.steps_json),
  };
}

export function diceRollCount(db: ReplayDatabase): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM dice_roll_entries').get() as {
    count: number;
  };
  return row.count;
}
