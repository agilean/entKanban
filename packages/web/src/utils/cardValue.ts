import { CardSize } from '@kanban-game/engine';

const VALUE_LABELS: Record<CardSize, string | null> = {
  [CardSize.VERY_HIGH]: '很高',
  [CardSize.HIGH]: '高',
  [CardSize.MEDIUM]: '中',
  [CardSize.LOW]: '低',
  [CardSize.NONE]: null,
};

export function formatBusinessValue(size: CardSize): string | null {
  return VALUE_LABELS[size];
}
