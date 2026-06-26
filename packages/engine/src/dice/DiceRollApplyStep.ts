import type { State } from '../State.js';

export type DiceRollApplyStep = {
  cardName: string;
  state: State;
  diceIndices: number[];
  dieLabels: string[];
  rollValues: number[];
  totalRoll: number;
  effortBefore: number;
  delta: number;
  effortAfter: number;
};
