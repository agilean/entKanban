import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { ClassOfService } from '../src/ClassOfService.js';
import { Context } from '../src/Context.js';
import { Day } from '../src/Day.js';
import { DaysFactory } from '../src/DaysFactory.js';
import { State } from '../src/State.js';
import { Blocker } from '../src/card/Card.js';
import { getCard } from '../src/card/Cards.js';
import { NullColumn } from '../src/column/NullColumn.js';
import { ReadyToDeployColumn } from '../src/column/ReadyToDeployColumn.js';
import { SelectedColumn } from '../src/column/SelectedColumn.js';
import { ComplexDiceAssignmentStrategy } from '../src/policies/ComplexDiceAssignmentStrategy.js';
import { NoCrossSkillingDiceAssignmentStrategy } from '../src/policies/NoCrossSkillingDiceAssignmentStrategy.js';
import { StateDice } from '../src/dice/StateDice.js';
import { LoadedDice } from './helpers/LoadedDice.js';

describe('ComplexDiceAssignmentStrategy', () => {
  it('assigns test dice to test cards', () => {
    const board = new Board();
    board.clear();
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));
    const s10 = getCard('S10');
    board.getStateColumn(State.TEST).addCard(s10, ClassOfService.STANDARD);

    new ComplexDiceAssignmentStrategy().assignDice(board);
    board.getStateColumn(State.TEST).doTheWork(new Context(board, new Day(1)));

    expect(s10.getRemainingWork(State.TEST)).toBe(3);
  });

  it('does not assign dice to blocked items', () => {
    const board = new Board();
    board.clear();
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));
    const s10 = getCard('S10');
    s10.setBlocker(new Blocker());
    board.getStateColumn(State.TEST).addCard(s10, ClassOfService.STANDARD);

    new ComplexDiceAssignmentStrategy().assignDice(board);
    board.getStateColumn(State.TEST).doTheWork(new Context(board, new Day(1)));

    expect(s10.getRemainingWork(State.TEST)).toBe(9);
  });

  it('uses unused test dice in development', () => {
    const board = new Board();
    board.clear();
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));
    const s10 = getCard('S10');
    board.getStateColumn(State.DEVELOPMENT).addCard(s10, ClassOfService.STANDARD);

    new ComplexDiceAssignmentStrategy().assignDice(board);
    board.getStateColumn(State.TEST).doTheWork(new Context(board, new Day(1)));

    expect(s10.getRemainingWork(State.DEVELOPMENT)).toBe(3);
  });

  it('uses unused development dice in test via day stand up', () => {
    const board = new Board();
    board.clear();
    const s10 = getCard('S10');
    board.getStateColumn(State.TEST).addCard(s10, ClassOfService.STANDARD);
    board.addDice(new StateDice(State.DEVELOPMENT, new LoadedDice(6)));

    const day = new Day(10);
    day.standUp(board);
    day.doTheWork(new Context(board, day));
    day.endOfDay(board);

    expect(s10.getRemainingWork(State.TEST)).toBe(6);
  });

  it('allocates dice according to expected roll', () => {
    const board = new Board();
    board.clear();
    board.addDice(new StateDice(State.TEST, new LoadedDice(1)));
    board.addDice(new StateDice(State.TEST, new LoadedDice(1)));
    const s3 = getCard('S3');
    board.getStateColumn(State.TEST).addCard(s3, ClassOfService.STANDARD);

    new ComplexDiceAssignmentStrategy(6).assignDice(board);
    board.getStateColumn(State.TEST).doTheWork(new Context(board, new Day(1)));

    expect(s3.getRemainingWork(State.TEST)).toBe(5);
  });
});

describe('NoCrossSkillingDiceAssignmentStrategy', () => {
  it('assigns all test dice to the highest-priority incomplete card', () => {
    const board = new Board();
    board.clear();
    const s10 = getCard('S10');
    const s11 = getCard('S11');
    board.getStateColumn(State.TEST).addCard(s10, ClassOfService.STANDARD);
    board.getStateColumn(State.TEST).addCard(s11, ClassOfService.STANDARD);
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));

    new NoCrossSkillingDiceAssignmentStrategy().assignDice(board);
    board.getStateColumn(State.TEST).doTheWork(new Context(board, new Day(9)));

    expect(s11.getRemainingWork(State.TEST)).toBe(0);
    expect(s10.getRemainingWork(State.TEST)).toBe(6);
  });
});

describe('ReadyToDeployColumn', () => {
  it('only pulls on billing days', () => {
    const selected = new SelectedColumn(1, new NullColumn());
    selected.addCard(getCard('S1'), ClassOfService.STANDARD);

    let context = new Context(new Board(), new Day(1));
    const readyToDeploy = new ReadyToDeployColumn(selected);
    readyToDeploy.doTheWork(context);
    expect(readyToDeploy.pull(context, ClassOfService.STANDARD)).toBeUndefined();

    context = new Context(new Board(), new Day(3));
    readyToDeploy.doTheWork(context);
    expect(readyToDeploy.pull(context, ClassOfService.STANDARD)?.getName()).toBe('S1');
  });

  it('deploys every day after continuous delivery is enabled', () => {
    const i1 = getCard('I1');
    const board = new Board();
    board.clear();
    board.addDice(new StateDice(State.ANALYSIS, new LoadedDice(1)));
    board.addDice(new StateDice(State.DEVELOPMENT, new LoadedDice(4)));
    board.addDice(new StateDice(State.TEST, new LoadedDice(2)));
    board.getOptions().addCard(i1, ClassOfService.STANDARD);

    const factory = new DaysFactory(true);
    for (let i = 4; i < 7; i++) {
      const day = factory.getDay(i);
      day.standUp(board);
      day.doTheWork(new Context(board, day));
      day.endOfDay(board);
    }

    expect(i1.getDayDeployed()).toBe(6);
  });
});
