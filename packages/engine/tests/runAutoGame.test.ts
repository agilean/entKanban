import { describe, expect, it } from 'vitest';
import { runAutoGame } from '../src/simulation/runAutoGame.js';

describe('runAutoGame', () => {
  it('runs day 10 through 21 and returns a financial summary', () => {
    const { board, summary } = runAutoGame();

    expect(board.getCards().length).toBeGreaterThan(0);
    expect(summary.getTotalGrossProfitToDate(21)).toBeTypeOf('number');
    expect(summary.toString()).toContain('Gross Profit To Date');
  });
});
