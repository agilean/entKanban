import type { Day } from '../Day.js';
import { FixedDateCard } from './FixedDateCard.js';
import type { CardSize } from './Card.js';

export class ExpediteCard extends FixedDateCard {
  constructor(
    name: string,
    size: CardSize,
    analysis: number,
    development: number,
    test: number,
    subscribers: number,
    dueDate: number,
    fine: number,
    payment: number,
  ) {
    super(name, size, analysis, development, test, subscribers, dueDate, fine, payment);
  }

  override isExpeditable(_day: Day): boolean {
    return true;
  }
}
