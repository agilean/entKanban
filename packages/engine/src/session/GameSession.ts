import { Board } from '../Board.js';
import { ClassOfService } from '../ClassOfService.js';
import { Context } from '../Context.js';
import type { Day } from '../Day.js';
import { DaysFactory } from '../DaysFactory.js';
import { DayStore } from '../DayStore.js';
import { State } from '../State.js';
import { WipLimitAdjustment } from '../WipLimitAdjustment.js';
import type { Card } from '../card/Card.js';
import { createDaySnapshot } from '../history/createDaySnapshot.js';
import { DaySnapshotStore } from '../history/DaySnapshotStore.js';
import {
  cloneDiceRollLogEntry,
  type DiceRollLogEntry,
} from '../history/DiceRollLogEntry.js';
import { FinancialSummary } from '../finance/FinancialSummary.js';
import { isBillingDay } from '../finance/billingDays.js';
import type { Dice } from '../dice/Dice.js';
import { RandomDice } from '../dice/RandomDice.js';
import type { DiceRollApplyStep } from '../dice/DiceRollApplyStep.js';
import {
  applyDiceRollStep,
  buildDiceRollPreview,
  resolveDiceAssignments,
} from '../dice/rollDicePreview.js';
import type { DiceAssignmentStrategy } from '../policies/DiceAssignmentStrategy.js';
import { NoCrossSkillingDiceAssignmentStrategy } from '../policies/NoCrossSkillingDiceAssignmentStrategy.js';
import type { DispatchResult } from './DispatchResult.js';
import { GamePhase } from './GamePhase.js';
import { applyBoardSnapshot, captureBoardSnapshot } from './boardSnapshot.js';
import type { CardEffectEvent } from './CardEffectEvent.js';
import type { GameSessionState } from './GameSessionState.js';
import type { PendingAction } from './PendingAction.js';
import type { DiceAssignmentInput, PlayerAction } from './PlayerAction.js';

export type GameSessionOptions = {
  diceAssignmentStrategy?: DiceAssignmentStrategy;
  diceRoller?: Dice;
  backlogComparator?: (a: Card, b: Card) => number;
  activityComparator?: (a: Card, b: Card) => number;
};

export class GameSession {
  private trainingDecided: boolean;
  private manualDiceAssignments: DiceAssignmentInput[] | null = null;
  private pendingRollSteps: DiceRollApplyStep[] | null = null;
  private appliedRollCount = 0;
  private diceRollLog: DiceRollLogEntry[] = [];

  private constructor(
    private readonly board: Board,
    private readonly diceStrategy: DiceAssignmentStrategy,
    private readonly diceRoller: Dice,
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
      options.diceRoller ?? new RandomDice(),
      false,
      false,
      9,
      GamePhase.REPLENISH,
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
      new RandomDice(),
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
    if (state.manualDiceAssignments !== undefined) {
      session.manualDiceAssignments = state.manualDiceAssignments
        ? [...state.manualDiceAssignments]
        : null;
    }
    if (state.pendingRollSteps !== undefined) {
      session.pendingRollSteps = state.pendingRollSteps ? [...state.pendingRollSteps] : null;
    }
    if (state.appliedRollCount !== undefined) {
      session.appliedRollCount = state.appliedRollCount;
    }
    if (state.diceRollLog !== undefined) {
      session.diceRollLog = state.diceRollLog.map(cloneDiceRollLogEntry);
    }
    if (session.phase === GamePhase.ADJUST_WIP) {
      session.beginReplenishPhase();
    } else {
      session.migrateLegacyPhase();
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

  getManualDiceAssignments(): readonly DiceAssignmentInput[] | null {
    return this.manualDiceAssignments ? [...this.manualDiceAssignments] : null;
  }

  getPendingRollSteps(): readonly DiceRollApplyStep[] {
    return this.pendingRollSteps ? [...this.pendingRollSteps] : [];
  }

  getAppliedRollCount(): number {
    return this.appliedRollCount;
  }

  getDiceRollLog(): readonly DiceRollLogEntry[] {
    return this.diceRollLog.map(cloneDiceRollLogEntry);
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
      manualDiceAssignments: this.manualDiceAssignments,
      pendingRollSteps: this.pendingRollSteps,
      appliedRollCount: this.appliedRollCount,
      diceRollLog: this.diceRollLog.map(cloneDiceRollLogEntry),
    };
  }

  dispatch(action: PlayerAction): DispatchResult {
    try {
      switch (action.type) {
        case 'adjust-wip-limits':
          return this.handleAdjustWip(action.adjustment);
        case 'reorder-backlog':
          return this.handleReorderBacklog(action.cardNames);
        case 'reorder-selected':
          return this.handleReorderSelected(action.cardNames);
        case 'pull-to-selected':
          return this.handlePullToSelected(action.cardName);
        case 'advance-card':
          return this.handleAdvanceCard(action.fromColumn, action.toColumn, action.cardName);
        case 'expedite-card':
          return this.handleExpediteCard(action.state, action.cardName);
        case 'assign-dice':
          return this.handleAssignDice(action.assignments);
        case 'roll-dice':
          return this.handleRollDice();
        case 'apply-roll-step':
          return this.handleApplyRollStep(action.index);
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

  private success(
    effects: CardEffectEvent[] = [],
    diceRollLogged?: DiceRollLogEntry,
  ): DispatchResult {
    return {
      ok: true,
      phase: this.phase,
      pendingActions: this.buildPendingActions(),
      effects: effects.length > 0 ? effects : undefined,
      diceRollLogged,
    };
  }

  private recordCompletedDiceRoll(): DiceRollLogEntry | undefined {
    if (!this.pendingRollSteps || this.pendingRollSteps.length === 0) {
      return undefined;
    }

    const entry: DiceRollLogEntry = {
      day: this.currentDay,
      recordedAt: new Date().toISOString(),
      assignments: (this.manualDiceAssignments ?? []).map((assignment) => ({
        state: assignment.state,
        cardName: assignment.cardName,
        diceIndices: [...assignment.diceIndices],
      })),
      steps: this.pendingRollSteps.map((step) => ({
        ...step,
        diceIndices: [...step.diceIndices],
        dieLabels: [...step.dieLabels],
        rollValues: [...step.rollValues],
      })),
    };
    this.diceRollLog.push(entry);
    return entry;
  }

  private isPreparationPhase(): boolean {
    return this.phase === GamePhase.SETUP || this.phase === GamePhase.REPLENISH;
  }

  private beginReplenishPhase(): void {
    this.phase = GamePhase.REPLENISH;
  }

  private migrateLegacyPhase(): void {
    if (
      this.phase === GamePhase.SETUP ||
      this.phase === GamePhase.EXPEDITE ||
      this.phase === GamePhase.ASSIGN_DICE
    ) {
      this.phase = GamePhase.REPLENISH;
    }
  }

  private handleAdjustWip(_adjustment: WipLimitAdjustment): DispatchResult {
    return { ok: false, error: 'WIP 限制已固定，不可调整' };
  }

  private handleReorderBacklog(cardNames: string[]): DispatchResult {
    if (this.phase !== GamePhase.SETUP && this.phase !== GamePhase.REPLENISH) {
      return { ok: false, error: 'Backlog reorder not allowed in current phase' };
    }
    this.board.getOptions().reorder(cardNames);
    return this.success();
  }

  private handleReorderSelected(cardNames: string[]): DispatchResult {
    if (this.phase !== GamePhase.SETUP && this.phase !== GamePhase.REPLENISH) {
      return { ok: false, error: 'Selected reorder not allowed in current phase' };
    }
    this.board.getSelected().reorder(cardNames);
    return this.success();
  }

  private handleAdvanceCard(
    fromColumn: string,
    toColumn: string,
    cardName: string,
  ): DispatchResult {
    if (fromColumn === 'ready' && toColumn === 'deployed') {
      if (this.phase !== GamePhase.RELEASE) {
        return { ok: false, error: '请在发布阶段将就绪卡片拖入已部署' };
      }
    } else if (this.phase !== GamePhase.SETUP && this.phase !== GamePhase.REPLENISH) {
      return { ok: false, error: 'Card advance not allowed in current phase' };
    }
    const context = new Context(this.board, this.getCurrentDayObject());
    this.board.advanceCard(fromColumn, toColumn, cardName, context);
    return this.success(context.takeEffectEvents());
  }

  private handlePullToSelected(cardName: string): DispatchResult {
    if (this.phase !== GamePhase.SETUP && this.phase !== GamePhase.REPLENISH) {
      return { ok: false, error: 'Pull to selected not allowed in current phase' };
    }
    const selected = this.board.getSelected();
    if (selected.getCards().length >= selected.getLimit()) {
      return { ok: false, error: 'Selected WIP limit reached' };
    }
    const backlog = this.board.getOptions();
    const backlogNames = backlog.getCards().map((card) => card.getName());
    if (!backlogNames.includes(cardName)) {
      return { ok: false, error: `Card not in backlog: ${cardName}` };
    }
    const reordered = [cardName, ...backlogNames.filter((name) => name !== cardName)];
    backlog.reorder(reordered);
    const context = new Context(this.board, this.getCurrentDayObject());
    const pulled = backlog.pull(context, ClassOfService.STANDARD);
    if (!pulled || pulled.getName() !== cardName) {
      return { ok: false, error: 'Could not pull card to selected' };
    }
    pulled.onSelected(context);
    selected.addCard(pulled, ClassOfService.STANDARD);
    return this.success();
  }

  private handleExpediteCard(_state: State, _cardName: string): DispatchResult {
    return { ok: false, error: '已取消加速区' };
  }

  private handleAssignDice(assignments: DiceAssignmentInput[]): DispatchResult {
    if (!this.isPreparationPhase()) {
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
      case GamePhase.REPLENISH:
        return this.handleRollDice();
      case GamePhase.RELEASE:
        return this.finishReleasePhase();
      case GamePhase.DAY_COMPLETE:
        return this.startNextDay();
      default:
        return { ok: false, error: `Cannot confirm phase: ${this.phase}` };
    }
  }

  private handleRollDice(): DispatchResult {
    if (this.phase !== GamePhase.REPLENISH) {
      return { ok: false, error: 'Dice roll not allowed in current phase' };
    }
    if (this.manualDiceAssignments === null) {
      return { ok: false, error: '请先将骰子分配到卡片上' };
    }
    const resolved = resolveDiceAssignments(this.board, this.manualDiceAssignments);
    if (resolved.length === 0) {
      return { ok: false, error: '请先将骰子分配到卡片上' };
    }
    this.pendingRollSteps = buildDiceRollPreview(this.board, resolved, this.diceRoller);
    this.appliedRollCount = 0;
    this.phase = GamePhase.DO_WORK;
    return this.success();
  }

  private handleApplyRollStep(index: number): DispatchResult {
    if (this.phase !== GamePhase.DO_WORK || !this.pendingRollSteps) {
      return { ok: false, error: 'No dice roll to apply' };
    }
    if (index !== this.appliedRollCount) {
      return { ok: false, error: 'Roll steps must be applied in order' };
    }
    const step = this.pendingRollSteps[index];
    if (!step) {
      return { ok: false, error: 'Invalid roll step index' };
    }
    applyDiceRollStep(this.board, step);
    this.appliedRollCount += 1;
    if (this.appliedRollCount >= this.pendingRollSteps.length) {
      return this.finishDiceWorkDay();
    }
    return this.success();
  }

  private finishDiceWorkDay(): DispatchResult {
    const diceRollLogged = this.recordCompletedDiceRoll();

    for (const state of Object.values(State)) {
      this.board.getStateColumn(state).clearDiceAssignments();
    }
    this.manualDiceAssignments = null;
    this.pendingRollSteps = null;
    this.appliedRollCount = 0;

    if (isBillingDay(this.currentDay)) {
      const effects = this.runBillingDayRelease();
      this.phase = GamePhase.RELEASE;
      return this.success(effects, diceRollLogged);
    }

    this.finishEndOfDay();
    if (this.phase === GamePhase.GAME_OVER) {
      return this.success([], diceRollLogged);
    }
    return this.startNextDay([], diceRollLogged);
  }

  private finishReleasePhase(): DispatchResult {
    if (this.phase !== GamePhase.RELEASE) {
      return { ok: false, error: 'Not in release phase' };
    }
    const context = new Context(this.board, this.getCurrentDayObject());
    this.autoDeployReadyCards(context);
    const effects = context.takeEffectEvents();
    const phaseAfterEnd = this.finishEndOfDay();
    return this.success(effects);
  }

  private runBillingDayRelease(): CardEffectEvent[] {
    const context = new Context(this.board, this.getCurrentDayObject());
    this.pullTestCompleteToReady(context);
    this.autoDeployReadyCards(context);
    return context.takeEffectEvents();
  }

  private pullTestCompleteToReady(context: Context): void {
    const testColumn = this.board.getStateColumn(State.TEST);
    testColumn.promoteCompletedWork();

    const completedInTest = testColumn
      .getCards()
      .filter((card) => card.getRemainingWork(State.TEST) === 0)
      .map((card) => card.getName());

    for (const name of completedInTest) {
      const check = this.board.canAdvanceCard(
        'test',
        'ready',
        name,
        context.getDay().getOrdinal(),
      );
      if (check.ok) {
        this.board.advanceCard('test', 'ready', name, context);
      }
    }
  }

  private autoDeployReadyCards(context: Context): void {
    const readyNames = this.board
      .getReadyToDeploy()
      .getCards()
      .map((card) => card.getName());
    for (const name of readyNames) {
      this.board.advanceCard('ready', 'deployed', name, context);
    }
  }

  private finishEndOfDay(): GamePhase {
    this.getCurrentDayObject().endOfDay(this.board);
    this.snapshotStore.append(createDaySnapshot(this.board, this.currentDay));
    if (this.currentDay >= 21) {
      this.phase = GamePhase.GAME_OVER;
      return this.phase;
    }
    this.phase = GamePhase.DAY_COMPLETE;
    return this.phase;
  }

  private startNextDay(
    carryEffects: CardEffectEvent[] = [],
    diceRollLogged?: DiceRollLogEntry,
  ): DispatchResult {
    if (this.phase !== GamePhase.DAY_COMPLETE) {
      return { ok: false, error: 'Not ready for next day' };
    }
    this.manualDiceAssignments = null;
    this.pendingRollSteps = null;
    this.appliedRollCount = 0;
    this.currentDay += 1;
    if (this.currentDay > 21) {
      this.phase = GamePhase.GAME_OVER;
      return this.success(carryEffects, diceRollLogged);
    }
    DayStore.setDay(this.getDaysFactory().getDay(this.currentDay));
    this.beginReplenishPhase();
    return this.success(carryEffects, diceRollLogged);
  }

  private buildPendingActions(): PendingAction[] {
    const pending: PendingAction[] = [];

    switch (this.phase) {
      case GamePhase.REPLENISH: {
        pending.push({
          kind: 'reorder-backlog',
          cardNames: this.board.getOptions().getCards().map((card) => card.getName()),
        });
        pending.push({ kind: 'assign-dice', diceCount: this.board.getDice().length });
        pending.push({ kind: 'confirm', label: 'do-work' });
        break;
      }
      case GamePhase.DO_WORK:
        if (this.pendingRollSteps && this.pendingRollSteps.length > 0) {
          pending.push({
            kind: 'dice-roll-preview',
            steps: [...this.pendingRollSteps],
            appliedCount: this.appliedRollCount,
          });
        }
        break;
      case GamePhase.RELEASE:
        pending.push({ kind: 'billing-summary', billingDay: this.currentDay });
        pending.push({ kind: 'confirm', label: 'finish-release' });
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
