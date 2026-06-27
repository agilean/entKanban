import { buildDefaultDiceAssignments } from '../../src/dice/rollDicePreview.js';
import type { GameSession } from '../../src/session/GameSession.js';

export function assignAllDice(session: GameSession): void {
  const assignments = buildDefaultDiceAssignments(session.getBoard());
  const result = session.dispatch({ type: 'assign-dice', assignments });
  if (!result.ok) {
    throw new Error(result.error ?? 'Failed to assign dice');
  }
}
