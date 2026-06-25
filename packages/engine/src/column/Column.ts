import type { ClassOfService } from '../ClassOfService.js';
import type { Context } from '../Context.js';
import type { Card } from '../card/Card.js';

export interface Column {
  addCard(card: Card, cos: ClassOfService): void;
  getCards(): Card[];
  pull(context: Context, cos: ClassOfService): Card | undefined;
  orderBy(comparator: (a: Card, b: Card) => number): void;
  doTheWork(context: Context): void;
  clear(): void;
  getLimit(): number;
  setLimit(limit: number): void;
}

export interface ColumnListener {
  cardAdded(card: Card): void;
}
