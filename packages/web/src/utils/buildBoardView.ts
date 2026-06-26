import {
  ClassOfService,
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
  index: number;
  state: State;
  label: string;
};

export type ColumnZones = {
  standard: CardView[];
  expedite: CardView[];
  done: CardView[];
};

export type ColumnView = {
  id: string;
  title: string;
  limitLabel: string;
  count: number;
  cards: CardView[];
  dice: DiceView[];
  state?: State;
  zones?: ColumnZones;
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

function mapAllDice(board: Board): DiceView[] {
  return board.getDice().map((die, index) => ({
    id: `die-${index}`,
    index,
    state: die.getActivity(),
    label: die.toString(),
  }));
}

function mapDiceForState(allDice: DiceView[], state: State): DiceView[] {
  return allDice.filter((die) => die.state === state);
}

function buildStateZones(board: Board, state: State): ColumnZones {
  const column = board.getStateColumn(state);
  const standard: CardView[] = [];
  const expedite: CardView[] = [];
  const done: CardView[] = [];

  for (const slot of column.getPlacementSnapshot()) {
    const card = board.findCardByName(slot.name);
    if (!card) {
      continue;
    }
    const view = mapCard(card);
    if (slot.done) {
      done.push(view);
    } else if (slot.cos === ClassOfService.EXPEDITE) {
      expedite.push(view);
    } else {
      standard.push(view);
    }
  }

  return { standard, expedite, done };
}

function buildStateColumn(board: Board, state: State, id: string, title: string): ColumnView {
  const column = board.getStateColumn(state);
  const allDice = mapAllDice(board);
  const zones = buildStateZones(board, state);
  const cards = [...zones.expedite, ...zones.standard, ...zones.done];

  return {
    id,
    title,
    state,
    limitLabel: formatLimit(column.getLimit()),
    count: column.getCards().length,
    cards,
    dice: mapDiceForState(allDice, state),
    zones,
  };
}

export function buildBoardView(board: Board): BoardView {
  const allDice = mapAllDice(board);

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
    buildStateColumn(board, State.ANALYSIS, 'analysis', 'Analysis'),
    buildStateColumn(board, State.DEVELOPMENT, 'development', 'Development'),
    buildStateColumn(board, State.TEST, 'test', 'Test'),
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
    unassignedDice: allDice,
  };
}
