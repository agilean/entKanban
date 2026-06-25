import { DayStore } from '../DayStore.js';
import type { Card } from '../card/Card.js';

function getCD3(card: Card): number {
  const day = DayStore.getDay();
  if (!day) {
    throw new Error('DayStore not set');
  }
  const costOfDelay = card.getCostOfDelay(day);
  const remainingWork = Math.max(card.getRemainingWork(), 1);
  return Math.round((costOfDelay / remainingWork) * 1000) / 1000;
}

export function wsjfCompare(c1: Card, c2: Card): number {
  return getCD3(c2) - getCD3(c1);
}
