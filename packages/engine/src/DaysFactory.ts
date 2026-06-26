import { Day } from './Day.js';
import type { DiceAssignmentStrategy } from './policies/DiceAssignmentStrategy.js';
import { NoCrossSkillingDiceAssignmentStrategy } from './policies/NoCrossSkillingDiceAssignmentStrategy.js';

export class DaysFactory {
  constructor(
    private readonly training: boolean,
    private readonly diceAssignmentStrategy: DiceAssignmentStrategy = new NoCrossSkillingDiceAssignmentStrategy(),
  ) {}

  supportsTraining(): boolean {
    return this.training;
  }

  getDiceAssignmentStrategy(): DiceAssignmentStrategy {
    return this.diceAssignmentStrategy;
  }

  getDay(day: number): Day {
    return new Day(day, this.diceAssignmentStrategy);
  }
}
