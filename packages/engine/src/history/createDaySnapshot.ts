import type { Board } from '../Board.js';
import { State } from '../State.js';
import { FinancialSummary } from '../finance/FinancialSummary.js';
import type { ColumnWipCounts, DaySnapshot } from './DaySnapshot.js';

export function captureWipCounts(board: Board): ColumnWipCounts {
  return {
    backlog: board.getOptions().getCards().length,
    selected: board.getSelected().getCards().length,
    analysis: board.getStateColumn(State.ANALYSIS).getCards().length,
    development: board.getStateColumn(State.DEVELOPMENT).getCards().length,
    test: board.getStateColumn(State.TEST).getCards().length,
    readyToDeploy: board.getReadyToDeploy().getCards().length,
    deployed: board.getDeployed().getCards().length,
  };
}

export function createDaySnapshot(board: Board, day: number): DaySnapshot {
  const summary = new FinancialSummary(board);
  return {
    day,
    wipCounts: captureWipCounts(board),
    deployedCardNames: board
      .getDeployed()
      .getCards()
      .filter((card) => card.getDayDeployed() === day)
      .map((card) => card.getName()),
    totalGrossProfit: summary.getTotalGrossProfitToDate(
      FinancialSummary.getBillingDay(day),
    ),
  };
}
