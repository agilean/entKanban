import { Board } from '../Board.js';
import { Context } from '../Context.js';
import type { BlockerRollResult, Day } from '../Day.js';
import { DaysFactory } from '../DaysFactory.js';
import { DayStore } from '../DayStore.js';
import { State } from '../State.js';
import { WipLimitAdjustment } from '../WipLimitAdjustment.js';
import type { Card } from '../card/Card.js';
import { createDaySnapshot } from '../history/createDaySnapshot.js';
import { DaySnapshotStore } from '../history/DaySnapshotStore.js';
import { FinancialSummary } from '../finance/FinancialSummary.js';
import { DiceGroup } from '../dice/DiceGroup.js';
import type { DiceAssignmentStrategy } from '../policies/DiceAssignmentStrategy.js';
import { NoCrossSkillingDiceAssignmentStrategy } from '../policies/NoCrossSkillingDiceAssignmentStrategy.js';
import type { DispatchResult } from './DispatchResult.js';
import { GamePhase } from './GamePhase.js';
import { applyBoardSnapshot, captureBoardSnapshot } from './boardSnapshot.js';
import type { GameSessionState } from './GameSessionState.js';
import type { PendingAction } from './PendingAction.js';
import type { DiceAssignmentInput, PlayerAction } from './PlayerAction.js';

export type GameSessionOptions = {
  diceAssignmentStrategy?: DiceAssignmentStrategy;
  backlogComparator?: (a: Card, b: Card) => number;
  activityComparator?: (a: Card, b: Card) => number;
};

export class GameSession {
  private trainingDecided: boolean;
  private manualDiceAssignments: DiceAssignmentInput[] | null = null;
  private lastBlockerRolls: BlockerRollResult[] = [];

  private constructor(
    private readonly board: Board,
    private readonly diceStrategy: DiceAssignmentStrategy,
    private training: boolean,
    trainingDecided: boolean,
    private currentDay: number,
    private phase: GamePhase,
    private readonly snapshotStore: DaySnapshotStore,
  ) {
    this.trainingDecided = trainingDecided;
  }

  static createNew(options: GameSessionOptions = {}): GameSession {
    const board = new Board();
    const diceStrategy =
      options.diceAssignmentStrategy ?? new NoCrossSkillingDiceAssignmentStrategy();

    if (options.backlogComparator) {
      board.getOptions().orderBy(options.backlogComparator);
    }
    if (options.activityComparator) {
      board.getSelected().orderBy(options.activityComparator);
      for (const state of [State.ANALYSIS, State.DEVELOPMENT, State.TEST]) {
        board.getStateColumn(state).orderBy(options.activityComparator);
      }
    }

    const session = new GameSession(
      board,
      diceStrategy,
      false,
      false,
      9,
      GamePhase.SETUP,
      new DaySnapshotStore(),
    );
    DayStore.setDay(session.getDaysFactory().getDay(9));
    return session;
  }

  static fromJSON(state: GameSessionState): GameSession {
    const board = new Board();
    applyBoardSnapshot(board, state.board);
    const diceStrategy = new NoCrossSkillingDiceAssignmentStrategy();
    const session = new GameSession(
      board,
      diceStrategy,
      state.training,
      state.trainingDecided,
      state.currentDay,
      state.phase,
      DaySnapshotStore.fromArray(state.snapshots),
    );
    for (const adjustment of state.wipAdjustments) {
      session.board.putAdjustment(
        new WipLimitAdjustment(
          adjustment.day,
          adjustment.expedite,
          adjustment.selected,
          adjustment.analysis,
          adjustment.development,
          adjustment.test,
        ),
      );
    }
    if (state.blockerRolls) {
      session.lastBlockerRolls = [...state.blockerRolls];
    }
    if (state.manualDiceAssignments !== undefined) {
      session.manualDiceAssignments = state.manualDiceAssignments
        ? [...state.manualDiceAssignments]
        : null;
    }
    DayStore.setDay(session.getDaysFactory().getDay(session.currentDay));
    return session;
  }

  getBoard(): Board {
    return this.board;
  }

  getCurrentDay(): number {
    return this.currentDay;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getPendingActions(): PendingAction[] {
    return this.buildPendingActions();
  }

  getSnapshots(): readonly ReturnType<DaySnapshotStore['getAll']>[number][] {
    return this.snapshotStore.getAll();
  }

  getFinancialSummary(): FinancialSummary {
    return new FinancialSummary(this.board);
  }

  isGameOver(): boolean {
    return this.phase === GamePhase.GAME_OVER;
  }

  supportsTraining(): boolean {
    return this.training;
  }

  toJSON(): GameSessionState {
    return {
      version: 1,
      currentDay: this.currentDay,
      phase: this.phase,
      training: this.training,
      trainingDecided: this.trainingDecided,
      backlogOrder: this.board.getOptions().getCards().map((card) => card.getName()),
      wipAdjustments: this.board.getWipAdjustments().map((adjustment) => ({
        day: adjustment.getDay(),
        expedite: adjustment.getExpedite(),
        selected: adjustment.getSelected(),
        analysis: adjustment.getAnalysis(),
        development: adjustment.getDevelopment(),
        test: adjustment.getTest(),
      })),
      snapshots: this.snapshotStore.toArray(),
      board: captureBoardSnapshot(this.board),
      blockerRolls: this.lastBlockerRolls.length > 0 ? [...this.lastBlockerRolls] : undefined,
      manualDiceAssignments: this.manualDiceAssignments,
    };
  }

  dispatch(action: PlayerAction): DispatchResult {
    try {
      switch (action.type) {
        case 'adjust-wip-limits':
          return this.handleAdjustWip(action.adjustment);
        case 'reorder-backlog':
          return this.handleReorderBacklog(action.cardNames);
        case 'expedite-card':
          return this.handleExpediteCard(action.state, action.cardName);
        case 'assign-dice':
          return this.handleAssignDice(action.assignments);
        case 'send-ted-to-training':
          return this.handleTedTraining(action.training);
        case 'confirm-phase':
          return this.handleConfirmPhase();
        default:
          return { ok: false, error: 'Unknown action' };
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private getDaysFactory(): DaysFactory {
    return new DaysFactory(this.training, this.diceStrategy);
  }

  private getCurrentDayObject(): Day {
    return this.getDaysFactory().getDay(this.currentDay);
  }

  private success(): DispatchResult {
    return {
      ok: true,
      phase: this.phase,
      pendingActions: this.buildPendingActions(),
    };
  }

  private handleAdjustWip(adjustment: WipLimitAdjustment): DispatchResult {
    if (this.phase !== GamePhase.SETUP && this.phase !== GamePhase.ADJUST_WIP) {
      return { ok: false, error: 'WIP adjustment not allowed in current phase' };
    }
    this.board.putAdjustment(adjustment);
    return this.success();
  }

  private handleReorderBacklog(cardNames: string[]): DispatchResult {
    if (this.phase !== GamePhase.SETUP && this.phase !== GamePhase.REPLENISH) {
      return { ok: false, error: 'Backlog reorder not allowed in current phase' };
    }
    this.board.getOptions().reorder(cardNames);
    return this.success();
  }

  private handleExpediteCard(state: State, cardName: string): DispatchResult {
    if (this.phase !== GamePhase.EXPEDITE) {
      return { ok: false, error: 'Expedite not allowed in current phase' };
    }
    const card = this.board.findCardByName(cardName);
    if (!card) {
      return { ok: false, error: `Card not found: ${cardName}` };
    }
    this.board.getStateColumn(state).manualExpedite(card, this.getCurrentDayObject());
    return this.success();
  }

  private handleAssignDice(assignments: DiceAssignmentInput[]): DispatchResult {
    if (this.phase !== GamePhase.ASSIGN_DICE) {
      return { ok: false, error: 'Dice assignment not allowed in current phase' };
    }
    this.manualDiceAssignments = assignments;
    return this.success();
  }

  private handleTedTraining(training: boolean): DispatchResult {
    if (this.phase !== GamePhase.TED_TRAINING) {
      return { ok: false, error: 'Ted training decision not allowed in current phase' };
    }
    this.training = training;
    this.trainingDecided = true;
    this.finishEndOfDay();
    return this.success();
  }

  private handleConfirmPhase(): DispatchResult {
    switch (this.phase) {
      case GamePhase.SETUP:
        this.currentDay = 10;
        this.phase = GamePhase.ADJUST_WIP;
        DayStore.setDay(this.getDaysFactory().getDay(10));
        return this.success();
      case GamePhase.ADJUST_WIP:
        this.getCurrentDayObject().adjustWipLimits(this.board);
        this.lastBlockerRolls = this.getCurrentDayObject().removeBlockers(this.board);
        this.phase = GamePhase.REPLENISH;
        return this.success();
      case GamePhase.REPLENISH:
        this.getCurrentDayObject().replenishSelected(this.board);
        this.lastBlockerRolls = [];
        this.phase = GamePhase.EXPEDITE;
        return this.success();
      case GamePhase.EXPEDITE:
        this.getCurrentDayObject().expediteTickets(this.board);
        this.phase = GamePhase.ASSIGN_DICE;
        return this.success();
      case GamePhase.ASSIGN_DICE:
        this.applyDiceAssignments();
        this.phase = GamePhase.DO_WORK;
        return this.success();
      case GamePhase.DO_WORK:
        this.getCurrentDayObject().doTheWork(new Context(this.board, this.getCurrentDayObject()));
        if (this.currentDay === 17 && !this.trainingDecided) {
          this.phase = GamePhase.TED_TRAINING;
        } else {
          this.finishEndOfDay();
        }
        return this.success();
      case GamePhase.DAY_COMPLETE:
        return this.startNextDay();
      default:
        return { ok: false, error: `Cannot confirm phase: ${this.phase}` };
    }
  }

  private applyDiceAssignments(): void {
    if (this.manualDiceAssignments && this.manualDiceAssignments.length > 0) {
      for (const state of Object.values(State)) {
        this.board.getStateColumn(state).clearDiceAssignments();
      }
      const groupsByState = new Map<State, DiceGroup[]>();
      const allDice = this.board.getDice();
      for (const assignment of this.manualDiceAssignments) {
        const card = this.board.findCardByName(assignment.cardName);
        if (!card) {
          throw new Error(`Card not found: ${assignment.cardName}`);
        }
        const dice = assignment.diceIndices.map((index) => {
          if (index < 0 || index >= allDice.length) {
            throw new Error(`Invalid dice index: ${index}`);
          }
          return allDice[index]!;
        });
        const groups = groupsByState.get(assignment.state) ?? [];
        groups.push(new DiceGroup(card, ...dice));
        groupsByState.set(assignment.state, groups);
      }
      for (const [state, groups] of groupsByState) {
        this.board.getStateColumn(state).assignDice(...groups);
      }
    } else {
      this.getCurrentDayObject().assignDice(this.board);
    }
    this.manualDiceAssignments = null;
  }

  private finishEndOfDay(): void {
    this.getCurrentDayObject().endOfDay(this.board);
    this.snapshotStore.append(createDaySnapshot(this.board, this.currentDay));
    if (this.currentDay >= 21) {
      this.phase = GamePhase.GAME_OVER;
      return;
    }
    this.phase = GamePhase.DAY_COMPLETE;
  }

  private startNextDay(): DispatchResult {
    if (this.phase !== GamePhase.DAY_COMPLETE) {
      return { ok: false, error: 'Not ready for next day' };
    }
    this.currentDay += 1;
    if (this.currentDay > 21) {
      this.phase = GamePhase.GAME_OVER;
      return this.success();
    }
    this.phase = GamePhase.ADJUST_WIP;
    DayStore.setDay(this.getDaysFactory().getDay(this.currentDay));
    return this.success();
  }

  private buildPendingActions(): PendingAction[] {
    const pending: PendingAction[] = [];
    const day = this.getCurrentDayObject();

    switch (this.phase) {
      case GamePhase.SETUP:
      case GamePhase.ADJUST_WIP:
        if (this.board.getWipAdjustmentCount() < 3) {
          pending.push({
            kind: 'adjust-wip',
            remaining: 3 - this.board.getWipAdjustmentCount(),
            max: 3,
          });
        }
        pending.push({
          kind: 'confirm',
          label: this.phase === GamePhase.SETUP ? 'start-day-10' : 'continue-stand-up',
        });
        break;
      case GamePhase.REPLENISH:
        if (this.lastBlockerRolls.length > 0) {
          pending.push({ kind: 'blocker-rolls', rolls: [...this.lastBlockerRolls] });
        }
        pending.push({
          kind: 'reorder-backlog',
          cardNames: this.board.getOptions().getCards().map((card) => card.getName()),
        });
        pending.push({ kind: 'confirm', label: 'replenish' });
        break;
      case GamePhase.EXPEDITE:
        for (const state of [State.ANALYSIS, State.DEVELOPMENT, State.TEST]) {
          const eligible = this.board
            .getStateColumn(state)
            .getExpeditableStandardCards(day)
            .map((card) => card.getName());
          if (eligible.length > 0) {
            pending.push({ kind: 'expedite', state, eligibleCards: eligible });
          }
        }
        pending.push({ kind: 'confirm', label: 'expedite-remaining' });
        break;
      case GamePhase.ASSIGN_DICE:
        pending.push({ kind: 'assign-dice', diceCount: this.board.getDice().length });
        pending.push({ kind: 'confirm', label: 'assign-dice' });
        break;
      case GamePhase.DO_WORK:
        pending.push({ kind: 'confirm', label: 'do-work' });
        break;
      case GamePhase.TED_TRAINING:
        pending.push({ kind: 'ted-training', day: 17 });
        break;
      case GamePhase.DAY_COMPLETE:
        pending.push({ kind: 'confirm', label: 'next-day' });
        break;
      case GamePhase.GAME_OVER:
        break;
    }

    return pending;
  }
}
