import type { Card } from '../card/Card.js';
import { FixedDateCard } from '../card/FixedDateCard.js';

export function fixedDateCardsCompare(c1: Card, c2: Card): number {
  const c1Fixed = c1 instanceof FixedDateCard;
  const c2Fixed = c2 instanceof FixedDateCard;
  if (c1Fixed && c2Fixed) {
    return c1.getDueDate() - c2.getDueDate();
  }
  if (c1Fixed) return -1;
  if (c2Fixed) return 1;
  return 0;
}
