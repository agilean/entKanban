import { Day } from './Day.js';
import type { DiceAssignmentStrategy } from './policies/DiceAssignmentStrategy.js';
import { NoCrossSkillingDiceAssignmentStrategy } from './policies/NoCrossSkillingDiceAssignmentStrategy.js';
import { BigCorpExpedite } from './instructions/BigCorpExpedite.js';
import { CarlosFired } from './instructions/CarlosFired.js';
import { CarlosHired } from './instructions/CarlosHired.js';
import { DefectFound } from './instructions/DefectFound.js';
import { GraduateGlenExpedite } from './instructions/GraduateGlenExpedite.js';
import { MargaretsFeatures } from './instructions/MargaretsFeatures.js';
import { PeteFromPlatformTeam } from './instructions/PeteFromPlatformTeam.js';
import { TammyHired } from './instructions/TammyHired.js';
import { TedsTrainingOpportunity } from './instructions/TedsTrainingOpportunity.js';

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
    switch (day) {
      case 10:
        return new Day(day, this.diceAssignmentStrategy, new PeteFromPlatformTeam());
      case 11:
        return new Day(day, this.diceAssignmentStrategy, new CarlosHired());
      case 12:
        return new Day(day, this.diceAssignmentStrategy, new MargaretsFeatures());
      case 14:
        return new Day(day, this.diceAssignmentStrategy, new CarlosFired());
      case 15:
        return new Day(day, this.diceAssignmentStrategy, new BigCorpExpedite());
      case 17:
        return new Day(day, this.diceAssignmentStrategy, new TedsTrainingOpportunity(this.training), new DefectFound());
      case 18:
        return new Day(day, this.diceAssignmentStrategy, new GraduateGlenExpedite(), new TammyHired(this.training));
      default:
        return new Day(day, this.diceAssignmentStrategy);
    }
  }
}
