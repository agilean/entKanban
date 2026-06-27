import type { Board } from '../Board.js';
import { State } from '../State.js';
import type { DiceAssignmentInput } from '../session/PlayerAction.js';
import type { DiceRollApplyStep } from './DiceRollApplyStep.js';
import type { Dice } from './Dice.js';
import { RandomDice } from './RandomDice.js';

const STATE_ORDER: State[] = [State.ANALYSIS, State.DEVELOPMENT, State.TEST];

function stateLabel(state: State): string {
  return state.substring(0, 1).toUpperCase();
}

export function resolveDiceAssignments(
  manual: readonly DiceAssignmentInput[] | null,
): DiceAssignmentInput[] {
  if (manual === null) {
    return [];
  }

  const result: DiceAssignmentInput[] = [];
  for (const assignment of manual) {
    const diceIndices = [...assignment.diceIndices];
    if (diceIndices.length === 0) {
      continue;
    }
    result.push({ ...assignment, diceIndices });
  }

  return result;
}

/** Auto-assign all dice to incomplete cards — for simulations/tests only. */
export function buildDefaultDiceAssignments(board: Board): DiceAssignmentInput[] {
  const usedIndices = new Set<number>();
  const result: DiceAssignmentInput[] = [];
  const allDice = board.getDice();

  for (const state of STATE_ORDER) {
    const unassigned = allDice
      .map((die, index) => ({ die, index }))
      .filter(({ die, index }) => die.getActivity() === state && !usedIndices.has(index));

    if (unassigned.length === 0) {
      continue;
    }

    const cards = board.getStateColumn(state).getIncompleteCards();
    if (cards.length === 0) {
      continue;
    }

    unassigned.forEach(({ index }, position) => {
      const card = cards[position % cards.length]!;
      const existing = result.find((a) => a.state === state && a.cardName === card.getName());
      if (existing) {
        existing.diceIndices.push(index);
      } else {
        result.push({ state, cardName: card.getName(), diceIndices: [index] });
      }
      usedIndices.add(index);
    });
  }

  return result;
}

function rollGroupTotal(rollValues: number[]): number {
  return rollValues.reduce((sum, value) => sum + value, 0);
}

export function buildDiceRollPreview(
  board: Board,
  assignments: readonly DiceAssignmentInput[],
  roller: Dice = new RandomDice(),
): DiceRollApplyStep[] {
  const steps: DiceRollApplyStep[] = [];

  for (const assignment of assignments) {
    const card = board.findCardByName(assignment.cardName);
    if (!card) {
      throw new Error(`Card not found: ${assignment.cardName}`);
    }

    const dice = assignment.diceIndices.map((index) => {
      const die = board.getDice()[index];
      if (!die) {
        throw new Error(`Invalid dice index: ${index}`);
      }
      return die;
    });

    const rollValues = dice.map((die) => {
      if (assignment.state === die.getActivity()) {
        return roller.roll();
      }
      return Math.round(roller.roll() / 2);
    });
    const totalRoll = rollGroupTotal(rollValues);
    const effortBefore = card.getRemainingWork(assignment.state);
    const delta = Math.min(totalRoll, effortBefore);
    const effortAfter = effortBefore - delta;

    steps.push({
      cardName: assignment.cardName,
      state: assignment.state,
      diceIndices: [...assignment.diceIndices],
      dieLabels: dice.map((die) => stateLabel(die.getActivity())),
      rollValues,
      totalRoll,
      effortBefore,
      delta,
      effortAfter,
    });
  }

  return steps;
}

export function applyDiceRollStep(board: Board, step: DiceRollApplyStep): void {
  const card = board.findCardByName(step.cardName);
  if (!card) {
    throw new Error(`Card not found: ${step.cardName}`);
  }
  if (step.delta > 0) {
    card.doWork(step.state, step.delta);
  }
}
