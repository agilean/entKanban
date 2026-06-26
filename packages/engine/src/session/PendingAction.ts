import type { DiceRollApplyStep } from '../dice/DiceRollApplyStep.js';

export type PendingAction =
  | { kind: 'reorder-backlog'; cardNames: string[] }
  | { kind: 'assign-dice'; diceCount: number }
  | { kind: 'dice-roll-preview'; steps: DiceRollApplyStep[]; appliedCount: number }
  | { kind: 'billing-summary'; billingDay: number }
  | { kind: 'confirm'; label: string };
