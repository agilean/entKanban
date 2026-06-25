import type { Day } from '../Day.js';
import type { Context } from '../Context.js';
import { ClassOfService } from '../ClassOfService.js';
import { State } from '../State.js';
import { AbstractCard } from './AbstractCard.js';
import { CardSize } from './Card.js';
import { getCard } from './Cards.js';

export class IntangibleCard extends AbstractCard {
  constructor(name: string, size: CardSize, analysis: number, development: number, test: number) {
    super(name, size, analysis, development, test);
  }

  getSubscribers(): number {
    return 0;
  }

  getCostOfDelay(_day: Day): number {
    switch (this.getName()) {
      case 'I1':
      case 'I2':
        return 800;
      case 'I3':
        return 700;
      default:
        return 0;
    }
  }

  override onReadyToDeploy(context: Context): void {
    super.onReadyToDeploy(context);

    if (this.getName() === 'I1') {
      context.getBoard().getReadyToDeploy().setDeploymentFrequency(1);
    }
    if (this.getName() === 'I2') {
      const test = context.getBoard().getStateColumn(State.TEST);
      test.getIncompleteCards().forEach((c) => {
        c.doWork(State.TEST, Math.min(2, c.getRemainingWork(State.TEST)));
      });
      test.addListener({
        cardAdded: (c) => {
          c.doWork(State.TEST, 2);
        },
      });
    }
  }

  override onDeployed(context: Context): void {
    super.onDeployed(context);

    if (this.getName() === 'I3') {
      const backlog = context.getBoard().getOptions();
      for (const name of ['S29', 'S30', 'S31', 'S32', 'S33']) {
        backlog.addCard(getCard(name), ClassOfService.STANDARD);
      }
    }
  }
}
