import type { DiceRollLogEntry } from '@kanban-game/engine';
import { State } from '@kanban-game/engine';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendDiceRollLogEntry,
  clearDiceRollArchive,
  loadDiceRollArchive,
  syncSessionDiceRollLog,
} from '../src/utils/diceRollLogStorage';

const sampleEntry = (): DiceRollLogEntry => ({
  day: 9,
  recordedAt: '2026-06-27T12:00:00.000Z',
  assignments: [{ state: State.DEVELOPMENT, cardName: 'S7', diceIndices: [2] }],
  steps: [
    {
      cardName: 'S7',
      state: State.DEVELOPMENT,
      diceIndices: [2],
      dieLabels: ['D'],
      rollValues: [5],
      totalRoll: 5,
      effortBefore: 8,
      delta: 5,
      effortAfter: 3,
    },
  ],
});

describe('diceRollLogStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    clearDiceRollArchive();
  });

  it('appends entries to local archive', () => {
    appendDiceRollLogEntry(sampleEntry());
    const archive = loadDiceRollArchive();
    expect(archive.entries).toHaveLength(1);
    expect(archive.entries[0]!.steps[0]!.totalRoll).toBe(5);
  });

  it('deduplicates when syncing session log', () => {
    appendDiceRollLogEntry(sampleEntry());
    syncSessionDiceRollLog([sampleEntry()]);
    expect(loadDiceRollArchive().entries).toHaveLength(1);
  });
});
