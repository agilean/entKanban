import { ClassOfService } from '../ClassOfService.js';
import type { Context } from '../Context.js';
import type { Card } from '../card/Card.js';
import type { Column } from './Column.js';

export class DeployedColumn implements Column {
  private readonly cards: Card[] = [];
  private comparator: ((a: Card, b: Card) => number) | undefined;

  constructor(
    private readonly upstream: Column,
    private readonly expedite: Column,
  ) {}

  addCard(card: Card, _cos: ClassOfService): void {
    this.cards.push(card);
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  pull(context: Context, _cos: ClassOfService): Card | undefined {
    this.doTheWork(context);
    return undefined;
  }

  doTheWork(context: Context): void {
    this.pullFromUpstream(context, this.expedite, ClassOfService.EXPEDITE);
    this.pullFromUpstream(context, this.upstream, ClassOfService.STANDARD);
  }

  private pullFromUpstream(context: Context, upstream: Column, cos: ClassOfService): void {
    while (true) {
      const card = upstream.pull(context, cos);
      if (!card) {
        break;
      }
      card.onDeployed(context);
      this.addCard(card, cos);
    }
  }

  orderBy(comparator: (a: Card, b: Card) => number): void {
    this.comparator = comparator;
    if (this.comparator) {
      this.cards.sort(this.comparator);
    }
  }

  clear(): void {
    this.cards.length = 0;
  }

  getLimit(): number {
    return Number.MAX_SAFE_INTEGER;
  }

  setLimit(_limit: number): void {}

  toString(): string {
    return `[DEPLOYED (${this.cards.length}/∞)]`;
  }
}
