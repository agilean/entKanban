import type { State } from '../State.js';
import type { BlockerRollResult } from '../Day.js';

export type PendingAction =
  | { kind: 'adjust-wip'; remaining: number; max: 3 }
  | { kind: 'reorder-backlog'; cardNames: string[] }
  | { kind: 'expedite'; state: State; eligibleCards: string[] }
  | { kind: 'assign-dice'; diceCount: number }
  | { kind: 'ted-training'; day: 17 }
  | { kind: 'blocker-rolls'; rolls: BlockerRollResult[] }
  | { kind: 'confirm'; label: string };
