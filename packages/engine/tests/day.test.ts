import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { ClassOfService } from '../src/ClassOfService.js';
import { Context } from '../src/Context.js';
import { Day } from '../src/Day.js';
import { DayStore } from '../src/DayStore.js';
import { DaysFactory } from '../src/DaysFactory.js';
import { State } from '../src/State.js';
import { getCard } from '../src/card/Cards.js';
import { StateDice } from '../src/dice/StateDice.js';
import { NoCrossSkillingDiceAssignmentStrategy } from '../src/policies/NoCrossSkillingDiceAssignmentStrategy.js';
import { runDay } from '../src/day/runDay.js';
import { LoadedDice } from './helpers/LoadedDice.js';

describe('Day', () => {
  it('completes card work during stand up and doTheWork', () => {
    const card = getCard('S1');
    const board = new Board();
    board.clear();
    board.getStateColumn(State.ANALYSIS).addCard(card, ClassOfService.STANDARD);
    board.addDice(new StateDice(State.ANALYSIS, new LoadedDice(6)));

    const day = new DaysFactory(true).getDay(1);
    day.standUp(board);
    day.doTheWork(new Context(board, day));

    expect(card.getRemainingWork(State.ANALYSIS)).toBe(0);
  });

  it('returns ordinal', () => {
    expect(new DaysFactory(true).getDay(1).getOrdinal()).toBe(1);
  });

  it('executes instructions at end of day', () => {
    const board = new Board();
    expect(board.getStateColumn(State.ANALYSIS).getLimit()).toBe(2);

    const day = new Day(1, new NoCrossSkillingDiceAssignmentStrategy(), {
      execute: (b) => b.getStateColumn(State.ANALYSIS).setLimit(1),
    });
    day.endOfDay(board);

    expect(board.getStateColumn(State.ANALYSIS).getLimit()).toBe(1);
  });
});

describe('DaysFactory', () => {
  it('returns day nine with ordinal nine', () => {
    expect(new DaysFactory(false).getDay(9).getOrdinal()).toBe(9);
  });
});

describe('DayStore', () => {
  it('stores current day', () => {
    const day = new Day(9);
    DayStore.setDay(day);
    expect(DayStore.getDay()?.getOrdinal()).toBe(9);
    DayStore.clear();
  });
});

describe('runDay', () => {
  it('runs a full day cycle on the board', () => {
    const board = new Board();
    const before = board.getSelected().getCards().length;
    runDay(board, new DaysFactory(false).getDay(9));
    expect(board.getSelected().getCards().length).toBeGreaterThanOrEqual(before);
  });
});
