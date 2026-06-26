import { State } from '@kanban-game/engine';

export type EffortField = 'analysis' | 'development' | 'test';

const STATE_TO_EFFORT: Record<State, EffortField> = {
  [State.ANALYSIS]: 'analysis',
  [State.DEVELOPMENT]: 'development',
  [State.TEST]: 'test',
};

export function stateToEffortField(state: State): EffortField {
  return STATE_TO_EFFORT[state];
}
