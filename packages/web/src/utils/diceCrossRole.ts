import type { State } from '@kanban-game/engine';

export function isCrossRoleAssignment(workState: State, dieState: State): boolean {
  return workState !== dieState;
}
