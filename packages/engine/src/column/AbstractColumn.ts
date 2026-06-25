import type { Context } from '../Context.js';
import type { Card } from '../card/Card.js';

export abstract class AbstractColumn {
  getLimit(): number {
    return Number.MAX_SAFE_INTEGER;
  }

  setLimit(_limit: number): void {}

  doTheWork(_context: Context): void {}

  orderBy(_comparator: (a: Card, b: Card) => number): void {}
}
