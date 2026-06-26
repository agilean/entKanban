import type { DiceRollApplyStep } from '../dice/DiceRollApplyStep.js';
import type { State } from '../State.js';

export type PendingAction =
  | { kind: 'adjust-wip'; remaining: number; max: 3 }
  | { kind: 'reorder-backlog'; cardNames: string[] }
  | { kind: 'expedite'; state: State; eligibleCards: string[] }
  | { kind: 'assign-dice'; diceCount: number }
  | { kind: 'ted-training'; day: 17 }
  | { kind: 'dice-roll-preview'; steps: DiceRollApplyStep[]; appliedCount: number }
  | { kind: 'confirm'; label: string };
