import type { State } from '../State.js';
import type { WipLimitAdjustment } from '../WipLimitAdjustment.js';

export type DiceAssignmentInput = {
  state: State;
  cardName: string;
  diceIndices: number[];
};

export type PlayerAction =
  | { type: 'adjust-wip-limits'; adjustment: WipLimitAdjustment }
  | { type: 'reorder-backlog'; cardNames: string[] }
  | { type: 'reorder-selected'; cardNames: string[] }
  | { type: 'pull-to-selected'; cardName: string }
  | { type: 'expedite-card'; state: State; cardName: string }
  | { type: 'assign-dice'; assignments: DiceAssignmentInput[] }
  | { type: 'send-ted-to-training'; training: boolean }
  | { type: 'confirm-phase' };
