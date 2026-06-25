import { Board } from '../Board.js';
import { DaysFactory } from '../DaysFactory.js';
import { DayStore } from '../DayStore.js';
import { State } from '../State.js';
import { WipLimitAdjustment } from '../WipLimitAdjustment.js';
import { runDay } from '../day/runDay.js';
import { FinancialSummary } from '../finance/FinancialSummary.js';
import { ComplexDiceAssignmentStrategy } from '../policies/ComplexDiceAssignmentStrategy.js';
import { expeditesCompare } from '../policies/ExpeditesPrioritisationStrategy.js';
import { intangiblesFirstCompare } from '../policies/prioritisation.js';
import { nameCompare } from '../policies/nameCompare.js';
import { chainComparator } from '../policies/chainComparator.js';
import { wsjfCompare } from '../policies/WeightedShortestJobFirstPrioritisationStrategy.js';
import { RunConfiguration } from './RunConfiguration.js';

export function defaultRunConfiguration(): RunConfiguration {
  const comparator = chainComparator(
    expeditesCompare,
    intangiblesFirstCompare,
    wsjfCompare,
    nameCompare,
  );
  return new RunConfiguration(
    comparator,
    comparator,
    new ComplexDiceAssignmentStrategy(0.5, 2),
    false,
    new WipLimitAdjustment(11, 0, 2, 2, 4, 3),
  );
}

export function runAutoGame(config: RunConfiguration = defaultRunConfiguration()): {
  board: Board;
  summary: FinancialSummary;
} {
  const board = new Board();
  const daysFactory = new DaysFactory(
    config.supportsTraining(),
    config.getDiceAssignmentStrategy(),
  );
  DayStore.setDay(daysFactory.getDay(9));

  board.getOptions().orderBy(config.getBacklogComparator());
  board.getSelected().orderBy(config.getActivityComparator());
  board.getStateColumn(State.ANALYSIS).orderBy(config.getActivityComparator());
  board.getStateColumn(State.DEVELOPMENT).orderBy(config.getActivityComparator());
  board.getStateColumn(State.TEST).orderBy(config.getActivityComparator());
  board.getReadyToDeploy().orderBy(nameCompare);
  board.getDeployed().orderBy(nameCompare);

  for (const adjustment of config.getWipLimitAdjustments()) {
    board.putAdjustment(adjustment);
  }

  for (let day = 10; day < 22; day++) {
    runDay(board, daysFactory.getDay(day));
  }

  return { board, summary: new FinancialSummary(board) };
}
