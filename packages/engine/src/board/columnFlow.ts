import { State } from '../State.js';

export type FlowColumnId =
  | 'backlog'
  | 'selected'
  | 'analysis'
  | 'development'
  | 'test'
  | 'ready'
  | 'deployed';

export const COLUMN_NEXT: Partial<Record<FlowColumnId, FlowColumnId>> = {
  selected: 'analysis',
  analysis: 'development',
  development: 'test',
  test: 'ready',
  ready: 'deployed',
};

export const COLUMN_UPSTREAM: Partial<Record<FlowColumnId, FlowColumnId>> = {
  selected: 'backlog',
  analysis: 'selected',
  development: 'analysis',
  test: 'development',
  ready: 'test',
  deployed: 'ready',
};

export const COLUMN_STATE: Partial<Record<FlowColumnId, State>> = {
  analysis: State.ANALYSIS,
  development: State.DEVELOPMENT,
  test: State.TEST,
};

export function isValidAdvance(fromColumn: string, toColumn: string): boolean {
  return COLUMN_NEXT[fromColumn as FlowColumnId] === toColumn;
}
