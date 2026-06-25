import { ClassOfService } from '../ClassOfService.js';
import type { Context } from '../Context.js';
import type { Card } from '../card/Card.js';
import { ExpediteCard } from '../card/ExpediteCard.js';
import { chainComparator } from '../policies/chainComparator.js';
import { businessValueCompare, intangiblesFirstCompare } from '../policies/prioritisation.js';
import { AbstractColumn } from './AbstractColumn.js';
import { MutablePriorityQueue } from './MutablePriorityQueue.js';

export class Options extends AbstractColumn {
  private readonly cards: MutablePriorityQueue<Card>;

  constructor(comparator?: (a: Card, b: Card) => number) {
    super();
    this.cards = new MutablePriorityQueue(
      comparator ?? chainComparator(intangiblesFirstCompare, businessValueCompare),
    );
  }

  doTheWork(_context: Context): void {}

  addCard(card: Card, _cos: ClassOfService): void {
    this.cards.add(card);
  }

  getCards(): Card[] {
    return this.cards.stream();
  }

  pull(context: Context, cos: ClassOfService): Card | undefined {
    if (cos === ClassOfService.EXPEDITE) {
      const expeditable = this.cards.stream().find(
        (c) => c.isExpeditable(context.getDay()) && c.getName() !== 'E2',
      );
      if (expeditable) {
        this.cards.remove(expeditable);
      }
      return expeditable;
    }
    const card = this.cards.stream().find((c) => !(c instanceof ExpediteCard));
    if (card) {
      this.cards.remove(card);
    }
    return card;
  }

  orderBy(comparator: (a: Card, b: Card) => number): void {
    this.cards.setComparator(comparator);
  }

  clear(): void {
    this.cards.clear();
  }

  toString(): string {
    return `[BACKLOG (${this.cards.size}/∞)]`;
  }
}

export function createDefaultOptions(): Options {
  return new Options(chainComparator(intangiblesFirstCompare, businessValueCompare));
}
