import type { Card } from '@kanban-game/engine';

export type WipAgeKind = 'flow' | 'cycle';

export type WipAge = {
  days: number;
  kind: WipAgeKind;
};

export function computeWipAge(card: Card, currentDay: number): WipAge | undefined {
  const daySelected = card.getDaySelected();
  if (daySelected <= 0) {
    return undefined;
  }
  const dayDeployed = card.getDayDeployed();
  if (dayDeployed > 0) {
    return {
      days: Math.max(1, dayDeployed - daySelected),
      kind: 'cycle',
    };
  }
  return {
    days: Math.max(0, currentDay - daySelected),
    kind: 'flow',
  };
}

export function wipAgeSeverity(days: number, kind: WipAgeKind): 'fresh' | 'aging' | 'stale' {
  if (kind === 'cycle') {
    return 'fresh';
  }
  if (days >= 6) {
    return 'stale';
  }
  if (days >= 3) {
    return 'aging';
  }
  return 'fresh';
}
