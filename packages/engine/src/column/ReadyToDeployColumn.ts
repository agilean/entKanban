import { ClassOfService } from '../ClassOfService.js';
import type { Context } from '../Context.js';
import type { Card } from '../card/Card.js';
import { wipAgingCompare } from '../policies/prioritisation.js';
import { AbstractColumn } from './AbstractColumn.js';
import type { Column } from './Column.js';
import { MutablePriorityQueue } from './MutablePriorityQueue.js';

export class ReadyToDeployColumn extends AbstractColumn {
  private readonly cards = new MutablePriorityQueue<Card>(wipAgingCompare);
  private deploymentFrequency = 3;

  constructor(private readonly upstream: Column) {
    super();
  }

  addCard(card: Card, cos: ClassOfService): void {
    if (cos === ClassOfService.EXPEDITE) {
      throw new Error('Expedite is not applicable for ready to deploy');
    }
    this.cards.add(card);
  }

  getCards(): Card[] {
    return this.cards.stream();
  }

  pull(context: Context, cos: ClassOfService): Card | undefined {
    if (cos === ClassOfService.EXPEDITE) {
      throw new Error("Shouldn't pull from ready to deploy with expedite class of service");
    }
    this.doTheWork(context);
    if (context.getDay().getOrdinal() % this.deploymentFrequency === 0) {
      return this.cards.poll();
    }
    return undefined;
  }

  doTheWork(context: Context): void {
    while (true) {
      const card = this.upstream.pull(context, ClassOfService.STANDARD);
      if (!card) {
        break;
      }
      card.onReadyToDeploy(context);
      this.addCard(card, ClassOfService.STANDARD);
    }
  }

  setDeploymentFrequency(deploymentFrequency: number): void {
    this.deploymentFrequency = deploymentFrequency;
  }

  orderBy(comparator: (a: Card, b: Card) => number): void {
    this.cards.setComparator(comparator);
  }

  getDeploymentFrequency(): number {
    return this.deploymentFrequency;
  }

  removeCard(card: Card): boolean {
    return this.cards.remove(card);
  }

  clear(): void {
    this.cards.clear();
  }

  toString(): string {
    return `[READY TO DEPLOY (${this.cards.size}/∞)]`;
  }
}
