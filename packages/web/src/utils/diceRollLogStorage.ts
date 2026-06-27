import type { DiceRollLogEntry } from '@kanban-game/engine';

export const DICE_ROLL_LOG_KEY = 'kanban-game-dice-roll-log';

export type DiceRollLogArchive = {
  version: 1;
  updatedAt: string;
  entries: DiceRollLogEntry[];
};

function emptyArchive(): DiceRollLogArchive {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: [],
  };
}

export function loadDiceRollArchive(): DiceRollLogArchive {
  const raw = localStorage.getItem(DICE_ROLL_LOG_KEY);
  if (!raw) {
    return emptyArchive();
  }
  try {
    const parsed = JSON.parse(raw) as DiceRollLogArchive;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return emptyArchive();
    }
    return parsed;
  } catch {
    return emptyArchive();
  }
}

export function appendDiceRollLogEntry(entry: DiceRollLogEntry): DiceRollLogArchive {
  const archive = loadDiceRollArchive();
  archive.entries.push(entry);
  archive.updatedAt = new Date().toISOString();
  localStorage.setItem(DICE_ROLL_LOG_KEY, JSON.stringify(archive));
  return archive;
}

export function clearDiceRollArchive(): void {
  localStorage.removeItem(DICE_ROLL_LOG_KEY);
}

export function diceRollArchiveCount(): number {
  return loadDiceRollArchive().entries.length;
}

export function downloadDiceRollArchive(filename?: string): void {
  const archive = loadDiceRollArchive();
  const blob = new Blob([JSON.stringify(archive, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = filename ?? `kanban-dice-roll-log-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Merge session log into archive without duplicating same day+timestamp entries. */
export function syncSessionDiceRollLog(sessionEntries: readonly DiceRollLogEntry[]): void {
  if (sessionEntries.length === 0) {
    return;
  }
  const archive = loadDiceRollArchive();
  const known = new Set(archive.entries.map((entry) => `${entry.day}:${entry.recordedAt}`));
  let changed = false;
  for (const entry of sessionEntries) {
    const key = `${entry.day}:${entry.recordedAt}`;
    if (known.has(key)) {
      continue;
    }
    archive.entries.push(entry);
    known.add(key);
    changed = true;
  }
  if (changed) {
    archive.updatedAt = new Date().toISOString();
    localStorage.setItem(DICE_ROLL_LOG_KEY, JSON.stringify(archive));
  }
}
