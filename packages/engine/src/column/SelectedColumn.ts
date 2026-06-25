import { ClassOfService } from '../ClassOfService.js';
import type { Context } from '../Context.js';
import type { Card } from '../card/Card.js';
import { wipAgingCompare } from '../policies/prioritisation.js';
import type { Column } from './Column.js';
import { LimitedColumn } from './LimitedColumn.js';
import { MutablePriorityQueue } from './MutablePriorityQueue.js';

export class SelectedColumn extends LimitedColumn {
  private readonly cards = new MutablePriorityQueue<Card>(wipAgingCompare);

  constructor(
    limit: number,
    private readonly upstream: Column,
  ) {
    super(limit);
  }

  addCard(card: Card, cos: ClassOfService): void {
    if (cos === ClassOfService.EXPEDITE) {
      throw new Error('Expedite is not applicable for selected');
    }
    if (this.cards.size === this.getLimit()) {
      throw new Error('WIP limit exceeded');
    }
    this.cards.add(card);
  }

  getCards(): Card[] {
    return this.cards.stream();
  }

  pull(_context: Context, cos: ClassOfService): Card | undefined {
    if (cos === ClassOfService.EXPEDITE) {
      throw new Error("Shouldn't pull for expedite from selected");
    }
    return this.cards.poll();
  }

  doTheWork(context: Context): void {
    while (this.getCards().length < this.getLimit()) {
      const card = this.upstream.pull(context, ClassOfService.STANDARD);
      if (!card) {
        break;
      }
      card.onSelected(context);
      this.addCard(card, ClassOfService.STANDARD);
    }
  }

  orderBy(comparator: (a: Card, b: Card) => number): void {
    this.cards.setComparator(comparator);
  }

  clear(): void {
    this.cards.clear();
  }

  toString(): string {
    return `[SELECTED (${this.cards.size}/${this.getLimit()})]`;
  }
}
