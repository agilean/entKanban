import type { Day } from '../Day.js';
import type { Context } from '../Context.js';
import { FinancialSummary } from '../finance/FinancialSummary.js';
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

  getCostOfDelay(d: Day): number {
    let daySelected = this.getDaySelected();
    let dayDeployed = Math.max(daySelected + 3, d.getOrdinal());
    if (daySelected === 0) {
      daySelected = d.getOrdinal();
      dayDeployed = daySelected + 3;
    }
    const cycleTime = dayDeployed - daySelected;
    const delay = 7;
    const stdRevenue = this.getRevenue(cycleTime, dayDeployed);
    const delayedRevenue = this.getRevenue(cycleTime + delay, dayDeployed + delay);
    return stdRevenue - delayedRevenue;
  }

  private getRevenue(cycleTime: number, dayDeployed: number): number {
    return (
      this.profile.getSubscribers(cycleTime) *
      FinancialSummary.getRevenueMultiplier(FinancialSummary.getBillingDay(dayDeployed))
    );
  }

  onDeployed(context: Context): void {
    super.onDeployed(context);
    if (this.getCycleTime() === 0) {
      throw new Error(`${this}:${this.getDayDeployed()}:${this.getDaySelected()}`);
    }
  }
}
