import { Board } from '../Board.js';
import { ClassOfService } from '../ClassOfService.js';
import { State } from '../State.js';
import { AbstractCard } from '../card/AbstractCard.js';
import { getCard } from '../card/Cards.js';
import type { Card } from '../card/Card.js';
import { RandomDice } from '../dice/RandomDice.js';
import { StateDice } from '../dice/StateDice.js';
import { replaySpecialCardEffects } from './cardEffectEvents.js';

export type CardWorkSnapshot = {
  name: string;
  analysis: number;
  development: number;
  test: number;
  daySelected: number;
  dayDeployed: number;
  blockerRemaining?: number;
};

export type StateColumnSlot = {
  name: string;
  cos: ClassOfService;
  done: boolean;
};

export type BoardSnapshot = {
  backlog: string[];
  selected: string[];
  analysis: StateColumnSlot[];
  development: StateColumnSlot[];
  test: StateColumnSlot[];
  ready: string[];
  deployed: string[];
  cards: CardWorkSnapshot[];
  dice: State[];
  limits: {
    selected: number;
    analysis: number;
    development: number;
    test: number;
  };
  testLimitsEnabled: boolean;
  testSecondaryWorkers: boolean;
  deploymentFrequency: number;
  testI2BoostEnabled?: boolean;
};

function asAbstractCard(card: Card): AbstractCard {
  if (!(card instanceof AbstractCard)) {
    throw new Error(`Cannot snapshot card: ${card.getName()}`);
  }
  return card;
}

export function captureBoardSnapshot(board: Board): BoardSnapshot {
  const testColumn = board.getStateColumn(State.TEST);
  return {
    backlog: board.getOptions().getCards().map((card) => card.getName()),
    selected: board.getSelected().getCards().map((card) => card.getName()),
    analysis: board.getStateColumn(State.ANALYSIS).getPlacementSnapshot(),
    development: board.getStateColumn(State.DEVELOPMENT).getPlacementSnapshot(),
    test: testColumn.getPlacementSnapshot(),
    ready: board.getReadyToDeploy().getCards().map((card) => card.getName()),
    deployed: board.getDeployed().getCards().map((card) => card.getName()),
    cards: board.getCards().map((card) => asAbstractCard(card).captureWorkSnapshot()),
    dice: board.getDice().map((die) => die.getActivity()),
    limits: {
      selected: board.getSelected().getLimit(),
      analysis: board.getStateColumn(State.ANALYSIS).getLimit(),
      development: board.getStateColumn(State.DEVELOPMENT).getLimit(),
      test: testColumn.getLimit(),
    },
    testLimitsEnabled: testColumn.areLimitsEnabled(),
    testSecondaryWorkers: testColumn.canAssignSecondaryWorkers(),
    deploymentFrequency: board.getReadyToDeploy().getDeploymentFrequency(),
    testI2BoostEnabled: testColumn.isI2TestBoostEnabled(),
  };
}

function createCardsByName(snapshot: BoardSnapshot): Map<string, Card> {
  const cardsByName = new Map<string, Card>();
  for (const cardState of snapshot.cards) {
    const card = getCard(cardState.name);
    asAbstractCard(card).restoreWorkSnapshot(cardState);
    cardsByName.set(cardState.name, card);
  }
  return cardsByName;
}

function addNamedCards(
  column: { addCard(card: Card, cos: ClassOfService): void },
  names: string[],
  cardsByName: Map<string, Card>,
  cos: ClassOfService = ClassOfService.STANDARD,
): void {
  for (const name of names) {
    const card = cardsByName.get(name);
    if (!card) {
      throw new Error(`Unknown card: ${name}`);
    }
    column.addCard(card, cos);
  }
}

export function applyBoardSnapshot(board: Board, snapshot: BoardSnapshot): void {
  board.resetForRestore();

  board.getSelected().setLimit(snapshot.limits.selected);
  board.getStateColumn(State.ANALYSIS).setLimit(snapshot.limits.analysis);
  board.getStateColumn(State.DEVELOPMENT).setLimit(snapshot.limits.development);
  board.getStateColumn(State.TEST).setLimit(snapshot.limits.test);

  const testColumn = board.getStateColumn(State.TEST);
  if (!snapshot.testLimitsEnabled) {
    testColumn.disableLimits();
  }
  if (!snapshot.testSecondaryWorkers) {
    testColumn.disableSecondaryWorkers();
  }
  board.getReadyToDeploy().setDeploymentFrequency(snapshot.deploymentFrequency);

  for (const activity of snapshot.dice) {
    board.addDice(new StateDice(activity, new RandomDice()));
  }

  const cardsByName = createCardsByName(snapshot);

  addNamedCards(board.getOptions(), snapshot.backlog, cardsByName);
  addNamedCards(board.getSelected(), snapshot.selected, cardsByName);
  board.getStateColumn(State.ANALYSIS).restorePlacements(snapshot.analysis, cardsByName);
  board.getStateColumn(State.DEVELOPMENT).restorePlacements(snapshot.development, cardsByName);
  testColumn.restorePlacements(snapshot.test, cardsByName);
  addNamedCards(board.getReadyToDeploy(), snapshot.ready, cardsByName);
  addNamedCards(board.getDeployed(), snapshot.deployed, cardsByName);

  if (snapshot.testI2BoostEnabled) {
    testColumn.enableI2TestBoost();
  }
  replaySpecialCardEffects(board);
}
