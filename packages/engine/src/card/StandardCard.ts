import type { Day } from '../Day.js';
import type { Context } from '../Context.js';
import { AbstractCard } from './AbstractCard.js';
import { CardSize } from './Card.js';
import type { SubscriberProfile } from '../profile/SubscriberProfile.js';

export class StandardCard extends AbstractCard {
  constructor(
    name: string,
    size: CardSize,
    analysis: number,
    development: number,
    test: number,
    private readonly profile: SubscriberProfile,
    daySelected = 0,
    dayDeployed = 0,
  ) {
    super(name, size, analysis, development, test, daySelected, dayDeployed);
  }

  getSubscribers(): number {
    if (this.getDayDeployed() === 0) {
      return 0;
    }
    return this.profile.getSubscribers(this.getCycleTime());
  }

  getCostOfDelay(_day: Day): number {
    return 0;
  }

  onDeployed(context: Context): void {
    super.onDeployed(context);
    if (this.getCycleTime() === 0) {
      throw new Error(`${this}:${this.getDayDeployed()}:${this.getDaySelected()}`);
    }
  }
}
