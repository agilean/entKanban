import {
  ClassOfService,
  ExpediteCard,
  FixedDateCard,
  IntangibleCard,
  State,
  type Board,
  type Card,
} from '@kanban-game/engine';
import { formatBusinessValue } from './cardValue';
import { computeWipAge, type WipAgeKind } from './wipAge';

export type CardCosKind = 'standard' | 'expedite' | 'fixed-date' | 'intangible';

export type CardView = {
  id: string;
  name: string;
  kind: CardCosKind;
  blocked: boolean;
  blockerRemaining?: number;
  advanceable?: boolean;
  effort: {
    analysis: number;
    development: number;
    test: number;
  };
  dueDate?: number;
  wipDays?: number;
  wipDaysKind?: WipAgeKind;
  businessValue?: string;
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

function isCardAdvanceable(card: Card, columnId: string): boolean {
  switch (columnId) {
    case 'selected':
    case 'ready':
      return true;
    case 'analysis':
      return card.getRemainingWork(State.ANALYSIS) === 0;
    case 'development':
      return card.getRemainingWork(State.DEVELOPMENT) === 0;
    case 'test':
      return card.getRemainingWork(State.TEST) === 0;
    default:
      return false;
  }
}

function mapCard(card: Card, columnId: string | undefined, currentDay: number): CardView {
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

  if (columnId) {
    view.advanceable = isCardAdvanceable(card, columnId);
  }

  const wipAge = computeWipAge(card, currentDay);
  if (wipAge) {
    view.wipDays = wipAge.days;
    view.wipDaysKind = wipAge.kind;
  }

  if (view.kind === 'standard') {
    const value = formatBusinessValue(card.getSize());
    if (value) {
      view.businessValue = value;
    }
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

function buildStateZones(board: Board, state: State, columnId: string, currentDay: number): ColumnZones {
  const column = board.getStateColumn(state);
  const standard: CardView[] = [];
  const expedite: CardView[] = [];
  const done: CardView[] = [];

  for (const slot of column.getPlacementSnapshot()) {
    const card = board.findCardByName(slot.name);
    if (!card) {
      continue;
    }
    const view = mapCard(card, columnId, currentDay);
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

function buildStateColumn(
  board: Board,
  state: State,
  id: string,
  title: string,
  currentDay: number,
): ColumnView {
  const column = board.getStateColumn(state);
  const allDice = mapAllDice(board);
  const zones = buildStateZones(board, state, id, currentDay);
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

export function buildBoardView(board: Board, currentDay: number): BoardView {
  const allDice = mapAllDice(board);

  const columns: ColumnView[] = [
    {
      id: 'backlog',
      title: '存量',
      limitLabel: '∞',
      count: board.getOptions().getCards().length,
      cards: board.getOptions().getCards().map((c) => mapCard(c, 'backlog', currentDay)),
      dice: [],
    },
    {
      id: 'selected',
      title: '优先',
      limitLabel: formatLimit(board.getSelected().getLimit()),
      count: board.getSelected().getCards().length,
      cards: board.getSelected().getCards().map((c) => mapCard(c, 'selected', currentDay)),
      dice: [],
    },
    buildStateColumn(board, State.ANALYSIS, 'analysis', '分析', currentDay),
    buildStateColumn(board, State.DEVELOPMENT, 'development', '开发', currentDay),
    buildStateColumn(board, State.TEST, 'test', '测试', currentDay),
    {
      id: 'ready',
      title: '就绪',
      limitLabel: '∞',
      count: board.getReadyToDeploy().getCards().length,
      cards: board.getReadyToDeploy().getCards().map((c) => mapCard(c, 'ready', currentDay)),
      dice: [],
    },
    {
      id: 'deployed',
      title: '已部署',
      limitLabel: '∞',
      count: board.getDeployed().getCards().length,
      cards: board.getDeployed().getCards().map((c) => mapCard(c, 'deployed', currentDay)),
      dice: [],
    },
  ];

  return {
    columns,
    unassignedDice: allDice,
  };
}
