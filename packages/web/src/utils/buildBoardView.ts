import {
  ExpediteCard,
  FixedDateCard,
  IntangibleCard,
  State,
  type Board,
  type Card,
} from '@kanban-game/engine';

export type CardCosKind = 'standard' | 'expedite' | 'fixed-date' | 'intangible';

export type CardView = {
  id: string;
  name: string;
  kind: CardCosKind;
  blocked: boolean;
  blockerRemaining?: number;
  effort: {
    analysis: number;
    development: number;
    test: number;
  };
  dueDate?: number;
};

export type DiceView = {
  id: string;
  state: State;
  label: string;
};

export type ColumnView = {
  id: string;
  title: string;
  limitLabel: string;
  count: number;
  cards: CardView[];
  dice: DiceView[];
};

export type BoardView = {
  columns: ColumnView[];
  unassignedDice: DiceView[];
};

function cardKind(card: Card): CardCosKind {
  if (card instanceof ExpediteCard) {
    return 'expedite';
  }
  if (card instanceof FixedDateCard) {
    return 'fixed-date';
  }
  if (card instanceof IntangibleCard) {
    return 'intangible';
  }
  return 'standard';
}

function mapCard(card: Card): CardView {
  const view: CardView = {
    id: card.getName(),
    name: card.getName(),
    kind: cardKind(card),
    blocked: card.isBlocked(),
    effort: {
      analysis: card.getRemainingWork(State.ANALYSIS),
      development: card.getRemainingWork(State.DEVELOPMENT),
      test: card.getRemainingWork(State.TEST),
    },
  };

  if (card.isBlocked() && card.getBlocker()) {
    view.blockerRemaining = card.getBlocker()!.getRemainingWork();
  }

  if (card instanceof FixedDateCard) {
    view.dueDate = card.getDueDate();
  }

  return view;
}

function formatLimit(limit: number): string {
  return limit >= Number.MAX_SAFE_INTEGER / 2 ? '∞' : String(limit);
}

function mapDice(board: Board, state?: State): DiceView[] {
  const dice = state ? board.getDiceForState(state) : board.getDice();
  return dice.map((die, index) => ({
    id: `${die.getActivity()}-${index}`,
    state: die.getActivity(),
    label: die.toString(),
  }));
}

export function buildBoardView(board: Board): BoardView {
  const columns: ColumnView[] = [
    {
      id: 'backlog',
      title: 'Backlog',
      limitLabel: '∞',
      count: board.getOptions().getCards().length,
      cards: board.getOptions().getCards().map(mapCard),
      dice: [],
    },
    {
      id: 'selected',
      title: 'Selected',
      limitLabel: formatLimit(board.getSelected().getLimit()),
      count: board.getSelected().getCards().length,
      cards: board.getSelected().getCards().map(mapCard),
      dice: [],
    },
    {
      id: 'analysis',
      title: 'Analysis',
      limitLabel: formatLimit(board.getStateColumn(State.ANALYSIS).getLimit()),
      count: board.getStateColumn(State.ANALYSIS).getCards().length,
      cards: board.getStateColumn(State.ANALYSIS).getCards().map(mapCard),
      dice: mapDice(board, State.ANALYSIS),
    },
    {
      id: 'development',
      title: 'Development',
      limitLabel: formatLimit(board.getStateColumn(State.DEVELOPMENT).getLimit()),
      count: board.getStateColumn(State.DEVELOPMENT).getCards().length,
      cards: board.getStateColumn(State.DEVELOPMENT).getCards().map(mapCard),
      dice: mapDice(board, State.DEVELOPMENT),
    },
    {
      id: 'test',
      title: 'Test',
      limitLabel: formatLimit(board.getStateColumn(State.TEST).getLimit()),
      count: board.getStateColumn(State.TEST).getCards().length,
      cards: board.getStateColumn(State.TEST).getCards().map(mapCard),
      dice: mapDice(board, State.TEST),
    },
    {
      id: 'ready',
      title: 'Ready',
      limitLabel: '∞',
      count: board.getReadyToDeploy().getCards().length,
      cards: board.getReadyToDeploy().getCards().map(mapCard),
      dice: [],
    },
    {
      id: 'deployed',
      title: 'Deployed',
      limitLabel: '∞',
      count: board.getDeployed().getCards().length,
      cards: board.getDeployed().getCards().map(mapCard),
      dice: [],
    },
  ];

  return {
    columns,
    unassignedDice: mapDice(board),
  };
}
