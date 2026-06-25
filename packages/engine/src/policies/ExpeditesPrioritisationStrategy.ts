import type { Card } from '../card/Card.js';
import { ExpediteCard } from '../card/ExpediteCard.js';

export function expeditesCompare(c1: Card, c2: Card): number {
  const c1Expedite = c1 instanceof ExpediteCard;
  const c2Expedite = c2 instanceof ExpediteCard;
  if (c1Expedite && c2Expedite) {
    return c1.getName().localeCompare(c2.getName());
  }
  if (c1Expedite) return -1;
  if (c2Expedite) return 1;
  return 0;
}
