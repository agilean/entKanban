import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { Day } from '../src/Day.js';
import { DaysFactory } from '../src/DaysFactory.js';
import { State } from '../src/State.js';
import { BigCorpExpedite } from '../src/instructions/BigCorpExpedite.js';
import { CarlosFired } from '../src/instructions/CarlosFired.js';
import { CarlosHired } from '../src/instructions/CarlosHired.js';
import { GraduateGlenExpedite } from '../src/instructions/GraduateGlenExpedite.js';
import { MargaretsFeatures } from '../src/instructions/MargaretsFeatures.js';
import { PeteFromPlatformTeam } from '../src/instructions/PeteFromPlatformTeam.js';
import { TammyHired } from '../src/instructions/TammyHired.js';
import { TedsTrainingOpportunity } from '../src/instructions/TedsTrainingOpportunity.js';
import { NoCrossSkillingDiceAssignmentStrategy } from '../src/policies/NoCrossSkillingDiceAssignmentStrategy.js';
import { StateDice } from '../src/dice/StateDice.js';
import { LoadedDice } from './helpers/LoadedDice.js';

function cardNames(board: Board): string[] {
  return board.getOptions().getCards().map((c) => c.getName());
}

describe('PeteFromPlatformTeam', () => {
  it('no longer adds blocker to S10', () => {
    const board = new Board();
    new Day(10, new NoCrossSkillingDiceAssignmentStrategy(), new PeteFromPlatformTeam()).endOfDay(board);
    const s10 = board.getCards().find((c) => c.getName() === 'S10');
    expect(s10?.isBlocked()).toBe(false);
  });
});

describe('CarlosHired', () => {
  it('removes wip limit on test', () => {
    const board = new Board();
    expect(board.getStateColumn(State.TEST).getLimit()).toBe(3);
    new Day(1, new NoCrossSkillingDiceAssignmentStrategy(), new CarlosHired()).endOfDay(board);
    expect(board.getStateColumn(State.TEST).getLimit()).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('CarlosFired', () => {
  it('restores wip limits on test', () => {
    const board = new Board();
    new Day(1, new NoCrossSkillingDiceAssignmentStrategy(), new CarlosHired()).endOfDay(board);
    expect(board.getStateColumn(State.TEST).getLimit()).toBe(Number.MAX_SAFE_INTEGER);

    new Day(2, new NoCrossSkillingDiceAssignmentStrategy(), new CarlosFired()).endOfDay(board);
    expect(board.getStateColumn(State.TEST).getLimit()).toBe(3);
  });

  it('hires another tester', () => {
    const board = new Board();
    board.clear();
    expect(board.getDiceForState(State.TEST)).toHaveLength(0);

    new Day(1, new NoCrossSkillingDiceAssignmentStrategy(), new CarlosFired()).endOfDay(board);
    expect(board.getDiceForState(State.TEST)).toHaveLength(1);
  });
});

describe('MargaretsFeatures', () => {
  it('introduces set 2 cards on day 12', () => {
    const board = new Board();
    board.clear();
    new MargaretsFeatures().execute(board);
    expect(board.getOptions().getCards()).toHaveLength(10);
  });
});

describe('BigCorpExpedite', () => {
  it('adds E1 to backlog', () => {
    const board = new Board();
    board.clear();
    expect(board.getOptions().getCards()).toHaveLength(0);
    new BigCorpExpedite().execute(board);
    expect(cardNames(board)).toEqual(['E1']);
  });
});

describe('GraduateGlenExpedite', () => {
  it('adds E2 to backlog', () => {
    const board = new Board();
    board.clear();
    expect(board.getOptions().getCards()).toHaveLength(0);
    new GraduateGlenExpedite().execute(board);
    expect(cardNames(board)).toEqual(['E2']);
  });
});

describe('TedsTrainingOpportunity', () => {
  it('removes a tester die when Ted goes to training', () => {
    const board = new Board();
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));
    new TedsTrainingOpportunity(true).execute(board);
    expect(board.getDiceForState(State.TEST)).toHaveLength(2);
  });

  it('keeps tester dice when Ted stays home', () => {
    const dice = new StateDice(State.TEST, new LoadedDice(6));
    const board = new Board();
    board.addDice(dice);
    new TedsTrainingOpportunity(false).execute(board);
    expect(board.getDiceForState(State.TEST)).toContain(dice);
  });
});

describe('TammyHired', () => {
  it('hires Tammy and returns Ted when training was chosen', () => {
    const board = new Board();
    expect(board.getDiceForState(State.TEST)).toHaveLength(2);
    new TammyHired(true).execute(board);
    expect(board.getDiceForState(State.TEST)).toHaveLength(4);
  });

  it('does nothing when training was not chosen', () => {
    const board = new Board();
    expect(board.getDiceForState(State.TEST)).toHaveLength(2);
    new TammyHired(false).execute(board);
    expect(board.getDiceForState(State.TEST)).toHaveLength(2);
  });
});

describe('DaysFactory', () => {
  it('returns plain days without event instructions', () => {
    const board = new Board();
    board.clear();
    const before = board.getOptions().getCards().length;
    new DaysFactory(false).getDay(15).endOfDay(board);
    expect(board.getOptions().getCards().length).toBe(before);
  });
});
