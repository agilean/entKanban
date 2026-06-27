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
      const activated = context.getBoard().getStateColumn(State.TEST).enableI2TestBoost();
      if (activated) {
        context.recordEffect({
          cardName: 'I2',
          kind: 'i2-test-boost',
          day: context.getDay().getOrdinal(),
          message: 'I2 已生效：测试列卡片测试工作量 -2（含新进卡）',
        });
      }
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
