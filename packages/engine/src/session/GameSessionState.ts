import type { DaySnapshot } from '../history/DaySnapshot.js';
import type { GamePhase } from './GamePhase.js';

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
};
