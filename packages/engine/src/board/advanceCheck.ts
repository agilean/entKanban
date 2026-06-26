export type AdvanceCheckResult = { ok: true } | { ok: false; reason: string };

export const COLUMN_LABELS: Record<string, string> = {
  backlog: '存量',
  selected: '优先',
  analysis: '分析',
  development: '开发',
  test: '测试',
  ready: '就绪',
  deployed: '已部署',
};

export const STATE_WORK_LABELS: Record<string, string> = {
  analysis: '分析 (A)',
  development: '开发 (D)',
  test: '测试 (T)',
};
