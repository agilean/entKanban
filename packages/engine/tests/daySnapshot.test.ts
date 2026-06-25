import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { captureWipCounts, createDaySnapshot } from '../src/history/createDaySnapshot.js';

describe('DaySnapshot', () => {
  it('captures column wip counts from initial board', () => {
    const board = new Board();
    const counts = captureWipCounts(board);

    expect(counts.backlog).toBeGreaterThan(0);
    expect(counts.deployed).toBe(3);
    expect(counts.selected).toBe(1);
  });

  it('creates snapshot with financial total', () => {
    const board = new Board();
    const snapshot = createDaySnapshot(board, 9);

    expect(snapshot.day).toBe(9);
    expect(snapshot.totalGrossProfit).toBe(200);
    expect(snapshot.deployedToday.map((card) => card.name)).toEqual(['S1', 'S2', 'S4']);
    expect(snapshot.deployedToday[0]!.cycleTime).toBeGreaterThan(0);
  });
});
