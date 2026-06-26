const CONFIRM_LABELS: Record<string, string> = {
  'start-day-10': '开始 Day 10',
  'continue-stand-up': '继续 Stand Up',
  replenish: '完成填充',
  'expedite-remaining': '完成 Expedite',
  'assign-dice': '确认骰子分配',
  'do-work': '开始工作',
  'next-day': '进入下一天',
};

export function confirmLabel(key: string): string {
  return CONFIRM_LABELS[key] ?? key;
}
