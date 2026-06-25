import type { GamePhase } from './GamePhase.js';
import type { PendingAction } from './PendingAction.js';

export type DispatchResult =
  | { ok: true; phase: GamePhase; pendingActions: PendingAction[] }
  | { ok: false; error: string };
