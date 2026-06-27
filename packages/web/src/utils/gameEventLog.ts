export type GameEventLevel = 'info' | 'warn' | 'error';

export type GameEventCategory =
  | 'phase'
  | 'dispatch'
  | 'effect'
  | 'dice'
  | 'replay'
  | 'storage'
  | 'system';

export type GameEventLogEntry = {
  timestamp: string;
  level: GameEventLevel;
  category: GameEventCategory;
  message: string;
  day?: number;
  phase?: string;
  action?: string;
  detail?: unknown;
};

export const GAME_EVENT_LOG_KEY = 'kanban-game-event-log';
const MAX_ENTRIES = 500;

export type GameEventLogArchive = {
  version: 1;
  updatedAt: string;
  entries: GameEventLogEntry[];
};

function emptyArchive(): GameEventLogArchive {
  return { version: 1, updatedAt: new Date().toISOString(), entries: [] };
}

export function loadGameEventLog(): GameEventLogArchive {
  const raw = localStorage.getItem(GAME_EVENT_LOG_KEY);
  if (!raw) {
    return emptyArchive();
  }
  try {
    const parsed = JSON.parse(raw) as GameEventLogArchive;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return emptyArchive();
    }
    return parsed;
  } catch {
    return emptyArchive();
  }
}

export function appendGameEvent(entry: Omit<GameEventLogEntry, 'timestamp'>): GameEventLogEntry {
  const archive = loadGameEventLog();
  const full: GameEventLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  archive.entries.push(full);
  if (archive.entries.length > MAX_ENTRIES) {
    archive.entries = archive.entries.slice(-MAX_ENTRIES);
  }
  archive.updatedAt = full.timestamp;
  localStorage.setItem(GAME_EVENT_LOG_KEY, JSON.stringify(archive));

  if (import.meta.env.DEV) {
    const prefix = `[${full.category}]`;
    if (full.level === 'error') {
      console.error(prefix, full.message, full.detail ?? '');
    } else if (full.level === 'warn') {
      console.warn(prefix, full.message, full.detail ?? '');
    } else {
      console.info(prefix, full.message, full.detail ?? '');
    }
  }

  return full;
}

export function clearGameEventLog(): void {
  localStorage.removeItem(GAME_EVENT_LOG_KEY);
}

export function gameEventLogCount(): number {
  return loadGameEventLog().entries.length;
}

export function downloadGameEventLog(filename?: string): void {
  const archive = loadGameEventLog();
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  anchor.href = url;
  anchor.download = filename ?? `kanban-system-log-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
