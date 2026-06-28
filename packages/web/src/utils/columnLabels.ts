import { COLUMN_NEXT, type FlowColumnId } from '@kanban-game/engine';

export const COLUMN_LABELS: Record<string, string> = {
  backlog: '存量',
  selected: '优先',
  analysis: '分析',
  development: '开发',
  test: '测试',
  ready: '就绪',
  deployed: '已部署',
};

export function columnLabel(columnId: string): string {
  return COLUMN_LABELS[columnId] ?? columnId;
}

export function nextColumnLabel(fromColumn: string): string | null {
  const next = COLUMN_NEXT[fromColumn as FlowColumnId];
  return next ? columnLabel(next) : null;
}
