import type { BlockerRollResult } from '../Day.js';
import type { DaySnapshot } from '../history/DaySnapshot.js';
import type { BoardSnapshot } from './boardSnapshot.js';
import type { GamePhase } from './GamePhase.js';
import type { DiceAssignmentInput } from './PlayerAction.js';

export type WipAdjustmentState = {
  day: number;
  expedite: number;
  selected: number;
  analysis: number;
  development: number;
  test: number;
};

export type GameSessionState = {
  version: 1;
  currentDay: number;
  phase: GamePhase;
  training: boolean;
  trainingDecided: boolean;
  backlogOrder: string[];
  wipAdjustments: WipAdjustmentState[];
  snapshots: DaySnapshot[];
  board: BoardSnapshot;
  blockerRolls?: BlockerRollResult[];
  manualDiceAssignments?: DiceAssignmentInput[] | null;
};
