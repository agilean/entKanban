import type { Card } from '../card/Card.js';
import { compareCardSize } from '../card/Card.js';

export function businessValuePrioritisationCompare(c1: Card, c2: Card): number {
  return compareCardSize(c1.getSize(), c2.getSize());
}
