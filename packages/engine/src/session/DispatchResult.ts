import type { DiceRollLogEntry } from '../history/DiceRollLogEntry.js';
import type { GamePhase } from './GamePhase.js';
import type { CardEffectEvent } from './CardEffectEvent.js';
import type { PendingAction } from './PendingAction.js';

export type DispatchResult =
  | {
      ok: true;
      phase: GamePhase;
      pendingActions: PendingAction[];
      effects?: CardEffectEvent[];
      diceRollLogged?: DiceRollLogEntry;
    }
  | { ok: false; error: string };
