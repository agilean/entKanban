import type { Card } from '../card/Card.js';
import type { DiceAssignmentStrategy } from '../policies/DiceAssignmentStrategy.js';
import type { WipLimitAdjustment } from '../WipLimitAdjustment.js';

export class RunConfiguration {
  private readonly wipLimitAdjustments: WipLimitAdjustment[];

  constructor(
    private readonly backlogComparator: (a: Card, b: Card) => number,
    private readonly activityComparator: (a: Card, b: Card) => number,
    private readonly diceAssignmentStrategy: DiceAssignmentStrategy,
    private readonly training: boolean,
    ...wipLimitAdjustments: WipLimitAdjustment[]
  ) {
    this.wipLimitAdjustments = wipLimitAdjustments;
  }

  getBacklogComparator(): (a: Card, b: Card) => number {
    return this.backlogComparator;
  }

  getActivityComparator(): (a: Card, b: Card) => number {
    return this.activityComparator;
  }

  getDiceAssignmentStrategy(): DiceAssignmentStrategy {
    return this.diceAssignmentStrategy;
  }

  supportsTraining(): boolean {
    return this.training;
  }

  getWipLimitAdjustments(): WipLimitAdjustment[] {
    return this.wipLimitAdjustments;
  }
}
