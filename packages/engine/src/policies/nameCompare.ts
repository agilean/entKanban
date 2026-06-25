import type { Card } from '../card/Card.js';

export function nameCompare(c1: Card, c2: Card): number {
  return c1.getName().localeCompare(c2.getName());
}
