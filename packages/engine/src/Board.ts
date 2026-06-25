import { ClassOfService } from './ClassOfService.js';
import { State } from './State.js';
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
}
