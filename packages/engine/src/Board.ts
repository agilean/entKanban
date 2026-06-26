import { ClassOfService } from './ClassOfService.js';
import { Context } from './Context.js';
import { State } from './State.js';
import {
  COLUMN_STATE,
  isValidAdvance,
  type FlowColumnId,
} from './board/columnFlow.js';
import { getCard } from './card/Cards.js';
import type { Card } from './card/Card.js';
import { DeployedColumn } from './column/DeployedColumn.js';
import { Options, createDefaultOptions } from './column/Options.js';
import { ReadyToDeployColumn } from './column/ReadyToDeployColumn.js';
import { SelectedColumn } from './column/SelectedColumn.js';
import { StateColumn } from './column/StateColumn.js';
import { RandomDice } from './dice/RandomDice.js';
import { StateDice } from './dice/StateDice.js';
import { chainComparator } from './policies/chainComparator.js';
import { businessValueCompare, intangiblesFirstCompare } from './policies/prioritisation.js';
import type { WipLimitAdjustment } from './WipLimitAdjustment.js';

export class Board {
  private readonly dice: StateDice[] = [];
  private readonly backlog: Options;
  private readonly selected: SelectedColumn;
  private readonly columns = new Map<State, StateColumn>();
  private readonly readyToDeploy: ReadyToDeployColumn;
  private readonly deployed: DeployedColumn;
  private readonly adjustments = new Map<number, WipLimitAdjustment>();

  constructor() {
    this.backlog = createDefaultOptions();
    this.selected = new SelectedColumn(3, this.backlog);
    this.columns.set(
      State.ANALYSIS,
      new StateColumn(State.ANALYSIS, 2, this.selected, this.backlog),
    );
    this.columns.set(
      State.DEVELOPMENT,
      new StateColumn(State.DEVELOPMENT, 4, this.columns.get(State.ANALYSIS)!, this.columns.get(State.ANALYSIS)!),
    );
    this.columns.set(
      State.TEST,
      new StateColumn(State.TEST, 3, this.columns.get(State.DEVELOPMENT)!, this.columns.get(State.DEVELOPMENT)!),
    );
    this.readyToDeploy = new ReadyToDeployColumn(this.columns.get(State.TEST)!);
    this.deployed = new DeployedColumn(this.readyToDeploy, this.columns.get(State.TEST)!);

    this.backlog.orderBy(chainComparator(intangiblesFirstCompare, businessValueCompare));

    this.initDice();
    this.initCards();
  }

  private initCards(): void {
    this.deployed.addCard(getCard('S1'), ClassOfService.STANDARD);
    this.deployed.addCard(getCard('S2'), ClassOfService.STANDARD);
    this.deployed.addCard(getCard('S4'), ClassOfService.STANDARD);
    this.getStateColumn(State.TEST).addCard(getCard('S3'), ClassOfService.STANDARD);
    this.getStateColumn(State.DEVELOPMENT).addCard(getCard('S5'), ClassOfService.STANDARD);
    this.getStateColumn(State.DEVELOPMENT).addCard(getCard('S6'), ClassOfService.STANDARD);
    this.getStateColumn(State.DEVELOPMENT).addCard(getCard('S7'), ClassOfService.STANDARD);
    this.getStateColumn(State.DEVELOPMENT).addCard(getCard('S9'), ClassOfService.STANDARD);
    this.getStateColumn(State.ANALYSIS).addCard(getCard('S8'), ClassOfService.STANDARD);
    this.getStateColumn(State.ANALYSIS).addCard(getCard('S10'), ClassOfService.STANDARD);
    this.selected.addCard(getCard('S13'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('S11'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('S12'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('S14'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('S15'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('S16'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('S17'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('S18'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('F1'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('F2'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('I1'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('I2'), ClassOfService.STANDARD);
    this.backlog.addCard(getCard('I3'), ClassOfService.STANDARD);
  }

  private initDice(): void {
    this.addDice(new StateDice(State.ANALYSIS, new RandomDice()));
    this.addDice(new StateDice(State.ANALYSIS, new RandomDice()));
    this.addDice(new StateDice(State.DEVELOPMENT, new RandomDice()));
    this.addDice(new StateDice(State.DEVELOPMENT, new RandomDice()));
    this.addDice(new StateDice(State.DEVELOPMENT, new RandomDice()));
    this.addDice(new StateDice(State.TEST, new RandomDice()));
    this.addDice(new StateDice(State.TEST, new RandomDice()));
  }

  getDice(): StateDice[] {
    return this.dice;
  }

  getDiceForState(state: State): StateDice[] {
    return this.dice.filter((d) => d.getActivity() === state);
  }

  addDice(dice: StateDice): void {
    this.dice.push(dice);
  }

  removeDice(dice: StateDice): void {
    const index = this.dice.indexOf(dice);
    if (index !== -1) {
      this.dice.splice(index, 1);
    }
  }

  getStateColumn(state: State): StateColumn {
    return this.columns.get(state)!;
  }

  getOptions(): Options {
    return this.backlog;
  }

  getSelected(): SelectedColumn {
    return this.selected;
  }

  getReadyToDeploy(): ReadyToDeployColumn {
    return this.readyToDeploy;
  }

  getDeployed(): DeployedColumn {
    return this.deployed;
  }

  putAdjustment(adjustment: WipLimitAdjustment): void {
    if (this.adjustments.size >= 3) {
      throw new Error('Too many WIP adjustments');
    }
    this.adjustments.set(adjustment.getDay(), adjustment);
  }

  getWipAdjustments(): WipLimitAdjustment[] {
    return [...this.adjustments.values()];
  }

  getWipAdjustmentCount(): number {
    return this.adjustments.size;
  }

  getCards(): Card[] {
    return [
      ...this.backlog.getCards(),
      ...this.selected.getCards(),
      ...this.getStateColumn(State.ANALYSIS).getCards(),
      ...this.getStateColumn(State.DEVELOPMENT).getCards(),
      ...this.getStateColumn(State.TEST).getCards(),
      ...this.readyToDeploy.getCards(),
      ...this.deployed.getCards(),
    ];
  }

  findCardByName(name: string): Card | undefined {
    return this.getCards().find((c) => c.getName() === name);
  }

  adjustLimits(ordinal: number): void {
    const adjustment = this.adjustments.get(ordinal);
    if (!adjustment) {
      return;
    }
    this.selected.setLimit(adjustment.getSelected());
    this.getStateColumn(State.ANALYSIS).setLimit(adjustment.getAnalysis());
    this.getStateColumn(State.DEVELOPMENT).setLimit(adjustment.getDevelopment());
    this.getStateColumn(State.TEST).setLimit(adjustment.getTest());
  }

  advanceCard(fromColumn: string, toColumn: string, cardName: string, context: Context): void {
    if (!isValidAdvance(fromColumn, toColumn)) {
      throw new Error(`Cannot advance from ${fromColumn} to ${toColumn}`);
    }
    const card = this.findCardByName(cardName);
    if (!card) {
      throw new Error(`Card not found: ${cardName}`);
    }
    if (!this.isCardInColumn(fromColumn, card)) {
      throw new Error(`Card ${cardName} is not in ${fromColumn}`);
    }

    const fromState = COLUMN_STATE[fromColumn as FlowColumnId];
    if (fromState !== undefined && card.getRemainingWork(fromState) > 0) {
      throw new Error(`Card ${cardName} still has remaining ${fromState} work`);
    }

    this.removeCardFromColumn(fromColumn, card);
    this.addCardToColumn(toColumn, card, context, this.removedCos);
  }

  private removedCos: ClassOfService = ClassOfService.STANDARD;

  private isCardInColumn(columnId: string, card: Card): boolean {
    switch (columnId) {
      case 'selected':
        return this.selected.getCards().some((item) => item.getName() === card.getName());
      case 'analysis':
      case 'development':
      case 'test':
        return this.getStateColumn(COLUMN_STATE[columnId as FlowColumnId]!)
          .getCards()
          .some((item) => item.getName() === card.getName());
      case 'ready':
        return this.readyToDeploy.getCards().some((item) => item.getName() === card.getName());
      default:
        return false;
    }
  }

  private removeCardFromColumn(columnId: string, card: Card): void {
    switch (columnId) {
      case 'selected':
        if (!this.selected.removeCard(card)) {
          throw new Error(`Failed to remove ${card.getName()} from selected`);
        }
        this.removedCos = ClassOfService.STANDARD;
        return;
      case 'analysis':
      case 'development':
      case 'test': {
        const removed = this.getStateColumn(COLUMN_STATE[columnId as FlowColumnId]!).removeCard(card);
        if (!removed) {
          throw new Error(`Failed to remove ${card.getName()} from ${columnId}`);
        }
        this.removedCos = removed.cos;
        return;
      }
      case 'ready':
        if (!this.readyToDeploy.removeCard(card)) {
          throw new Error(`Failed to remove ${card.getName()} from ready`);
        }
        this.removedCos = ClassOfService.STANDARD;
        return;
      default:
        throw new Error(`Cannot remove from column: ${columnId}`);
    }
  }

  private addCardToColumn(
    columnId: string,
    card: Card,
    context: Context,
    cos: ClassOfService,
  ): void {
    switch (columnId) {
      case 'analysis':
        if (card.getDaySelected() === 0) {
          card.onSelected(context);
        }
        this.getStateColumn(State.ANALYSIS).addCard(card, cos);
        return;
      case 'development':
        this.getStateColumn(State.DEVELOPMENT).addCard(card, cos);
        return;
      case 'test':
        this.getStateColumn(State.TEST).addCard(card, cos);
        return;
      case 'ready':
        card.onReadyToDeploy(context);
        this.readyToDeploy.addCard(card, cos);
        return;
      case 'deployed':
        card.onDeployed(context);
        this.deployed.addCard(card, cos);
        return;
      default:
        throw new Error(`Cannot add to column: ${columnId}`);
    }
  }

  clear(): void {
    this.dice.length = 0;
    this.backlog.clear();
    this.selected.clear();
    this.getStateColumn(State.ANALYSIS).clear();
    this.getStateColumn(State.DEVELOPMENT).clear();
    this.getStateColumn(State.TEST).clear();
    this.readyToDeploy.clear();
    this.deployed.clear();
  }

  resetForRestore(): void {
    this.clear();
    this.adjustments.clear();
    this.selected.setLimit(3);
    this.getStateColumn(State.ANALYSIS).setLimit(2);
    this.getStateColumn(State.DEVELOPMENT).setLimit(4);
    const testColumn = this.getStateColumn(State.TEST);
    testColumn.setLimit(3);
    testColumn.enableLimits();
    testColumn.enableSecondaryWorkers();
    this.readyToDeploy.setDeploymentFrequency(3);
  }
}
