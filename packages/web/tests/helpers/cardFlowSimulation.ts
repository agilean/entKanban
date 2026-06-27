import {
  Board,
  ClassOfService,
  Context,
  captureWipCounts,
  DaysFactory,
  type DaySnapshot,
} from '@kanban-game/engine';

/** A card move between board columns (matches Board.advanceCard). */
export type CardAdvanceMove = {
  type: 'advance';
  fromColumn: string;
  toColumn: string;
  cardName: string;
};

/** Pull a backlog card into Selected (matches GameSession pull-to-selected). */
export type CardPullMove = {
  type: 'pull-to-selected';
  cardName: string;
};

export type CardFlowAction = CardAdvanceMove | CardPullMove;

export type CardFlowDay = {
  day: number;
  actions: CardFlowAction[];
};

function captureFlowSnapshot(board: Board, day: number): DaySnapshot {
  return {
    day,
    wipCounts: captureWipCounts(board),
    deployedToday: board
      .getDeployed()
      .getCards()
      .filter((card) => card.getDayDeployed() === day)
      .map((card) => ({
        name: card.getName(),
        cycleTime: card.getCycleTime(),
        leadTime: card.getDayDeployed() - card.getDaySelected(),
      })),
    totalGrossProfit: 0,
  };
}

function applyAction(board: Board, context: Context, action: CardFlowAction): void {
  if (action.type === 'advance') {
    board.advanceCard(action.fromColumn, action.toColumn, action.cardName, context);
    return;
  }

  const backlog = board.getOptions();
  const selected = board.getSelected();
  const backlogNames = backlog.getCards().map((card) => card.getName());
  if (!backlogNames.includes(action.cardName)) {
    throw new Error(`Card not in backlog: ${action.cardName}`);
  }
  backlog.reorder([action.cardName, ...backlogNames.filter((name) => name !== action.cardName)]);
  const pulled = backlog.pull(context, ClassOfService.STANDARD);
  if (!pulled || pulled.getName() !== action.cardName) {
    throw new Error(`Could not pull card to selected: ${action.cardName}`);
  }
  pulled.onSelected(context);
  selected.addCard(pulled, ClassOfService.STANDARD);
}

/**
 * Simulate card movement day-by-day and capture end-of-day snapshots.
 * Days without explicit actions still get a snapshot (no moves that day).
 */
export function simulateCardFlow(flow: CardFlowDay[], endDay?: number): DaySnapshot[] {
  const board = new Board();
  const actionsByDay = new Map(flow.map(({ day, actions }) => [day, actions]));
  const lastActionDay = flow.length > 0 ? Math.max(...flow.map(({ day }) => day)) : 1;
  const finalDay = endDay ?? lastActionDay;
  const snapshots: DaySnapshot[] = [];

  for (let day = 1; day <= finalDay; day++) {
    const context = new Context(board, new DaysFactory(false).getDay(day));
    for (const action of actionsByDay.get(day) ?? []) {
      applyAction(board, context, action);
    }
    snapshots.push(captureFlowSnapshot(board, day));
  }

  return snapshots;
}
