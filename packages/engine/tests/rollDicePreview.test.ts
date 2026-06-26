import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { ClassOfService } from '../src/ClassOfService.js';
import { State } from '../src/State.js';
import { getCard } from '../src/card/Cards.js';
import { StateDice } from '../src/dice/StateDice.js';
import { LoadedDice } from './helpers/LoadedDice.js';
import {
  applyDiceRollStep,
  buildDiceRollPreview,
  resolveDiceAssignments,
} from '../src/dice/rollDicePreview.js';

describe('rollDicePreview', () => {
  it('resolves unassigned dice to incomplete cards in the column', () => {
    const board = new Board();
    board.clear();
    board.addDice(new StateDice(State.TEST, new LoadedDice(4)));
    board.getStateColumn(State.TEST).addCard(getCard('S3'), ClassOfService.STANDARD);

    const resolved = resolveDiceAssignments(board, null);
    expect(resolved).toEqual([
      { state: State.TEST, cardName: 'S3', diceIndices: [0] },
    ]);
  });

  it('applies rolled points to card effort', () => {
    const board = new Board();
    board.clear();
    const card = getCard('S3');
    board.getStateColumn(State.TEST).addCard(card, ClassOfService.STANDARD);
    board.addDice(new StateDice(State.TEST, new LoadedDice(4)));
    board.addDice(new StateDice(State.TEST, new LoadedDice(3)));

    const resolved = resolveDiceAssignments(board, [
      { state: State.TEST, cardName: 'S3', diceIndices: [0, 1] },
    ]);
    const steps = buildDiceRollPreview(board, resolved, new LoadedDice(4));
    expect(steps[0]!.totalRoll).toBe(8);
    expect(steps[0]!.delta).toBe(6);

    applyDiceRollStep(board, steps[0]!);
    expect(card.getRemainingWork(State.TEST)).toBe(0);
  });

  it('zeros roll when more than two dice are assigned to one card', () => {
    const board = new Board();
    board.clear();
    const card = getCard('S3');
    board.getStateColumn(State.TEST).addCard(card, ClassOfService.STANDARD);
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));
    board.addDice(new StateDice(State.TEST, new LoadedDice(6)));

    const resolved = resolveDiceAssignments(board, [
      { state: State.TEST, cardName: 'S3', diceIndices: [0, 1, 2] },
    ]);
    const steps = buildDiceRollPreview(board, resolved, new LoadedDice(6));
    expect(steps[0]!.totalRoll).toBe(0);
    expect(steps[0]!.delta).toBe(0);
  });
});
