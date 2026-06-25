import type { Day } from '../Day.js';
import { State } from '../State.js';
import { AbstractCard } from './AbstractCard.js';
import type { CardSize } from './Card.js';

export class FixedDateCard extends AbstractCard {
  constructor(
    name: string,
    size: CardSize,
    analysis: number,
    development: number,
    test: number,
    private readonly subscribers: number,
    private readonly dueDate: number,
    private readonly fine: number,
    private readonly payment: number,
  ) {
    super(name, size, analysis, development, test);
  }

  protected override isFixedDateCard(): boolean {
    return true;
  }

  getSubscribers(): number {
    if (this.hitDueDate()) {
      return this.subscribers;
    }
    return 0;
  }

  getFineOrPayment(): number {
    if (this.hitDueDate()) {
      return this.payment;
    }
    return this.fine;
  }

  private hitDueDate(): boolean {
    return this.getDayDeployed() > 0 && this.getDayDeployed() <= this.getDueDate();
  }

  override getDueDate(): number {
    return this.dueDate;
  }

  override isExpeditable(day: Day): boolean {
    return this.dueDate - day.getOrdinal() < 3;
  }

  getCostOfDelay(day: Day): number {
    if (this.dueDate - day.getOrdinal() > 3) {
      return 0;
    }
    return Math.max(Math.abs(this.fine), this.payment);
  }

  override toString(): string {
    return `${this.getName()}[${this.getRemainingWork(State.ANALYSIS)}/${this.getRemainingWork(State.DEVELOPMENT)}/${this.getRemainingWork(State.TEST)}]`;
  }
}
