import type { Card } from '../card/Card.js';
import { compareCardSize } from '../card/Card.js';
import { IntangibleCard } from '../card/IntangibleCard.js';

export function wipAgingCompare(c1: Card, c2: Card): number {
  return c1.getDaySelected() - c2.getDaySelected();
}

export function businessValueCompare(c1: Card, c2: Card): number {
  return compareCardSize(c1.getSize(), c2.getSize());
}

export function intangiblesFirstCompare(c1: Card, c2: Card): number {
  const c1Intangible = c1 instanceof IntangibleCard;
  const c2Intangible = c2 instanceof IntangibleCard;
  if (c1Intangible && c2Intangible) {
    return c1.getName().localeCompare(c2.getName());
  }
  if (c1Intangible) return -1;
  if (c2Intangible) return 1;
  return 0;
}
