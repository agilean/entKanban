import {
  captureWipCounts,
  FinancialSummary,
  GamePhase,
  GameSession,
  State,
  WipLimitAdjustment,
  mergeEffectEvents,
  consolidateReleaseEffectEvents,
  type CardEffectEvent,
  type DaySnapshot,
  type DiceAssignmentInput,
  type DiceRollLogEntry,
  type DispatchResult,
  type PendingAction,
  type PlayerAction,
} from '@kanban-game/engine';
import type { Board } from '@kanban-game/engine';
import type { DiceRollApplyStep } from '@kanban-game/engine';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { buildBoardView } from '../utils/buildBoardView';
import { stateToEffortField, type EffortField } from '../utils/effortHighlight';
import { endDiceDrag } from '../utils/diceDragState';
import { clearSavedGame, loadGame, saveGame, type SavedGamePayload } from '../utils/saveGame';
import {
  appendDiceRollLogEntry,
  diceRollArchiveCount,
  downloadDiceRollArchive,
  loadDiceRollArchive,
  syncSessionDiceRollLog,
} from '../utils/diceRollLogStorage';
import {
  checkReplayServerHealth,
  downloadReplayFromServer,
  getActivePlaySessionId,
  getReplaySessionId,
  pushDiceRollToServer,
  resetReplaySessionId,
  setActivePlaySessionId,
  setReplaySessionId,
  syncSessionSnapshot,
  type ReplaySyncStatus,
} from '../utils/replayApi';
import { startPlayInSession } from '../utils/playSessionApi';
import { appendGameEvent, gameEventLogCount, downloadGameEventLog } from '../utils/gameEventLog';
import type { AppTab } from './uiStore';

export type AssignedDiceView = {
  index: number;
  label: string;
  state: State;
};

export type DiceRollUiPhase = 'applying';

export type CardRollUiMode = 'rolling' | 'done';

export type DiceRollUiState = {
  visible: boolean;
  phase: DiceRollUiPhase;
  steps: DiceRollApplyStep[];
  activeIndex: number;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function removeDiceFromAssignments(
  assignments: DiceAssignmentInput[],
  diceIndex: number,
): DiceAssignmentInput[] {
  const result: DiceAssignmentInput[] = [];
  for (const assignment of assignments) {
    const diceIndices = assignment.diceIndices.filter((index) => index !== diceIndex);
    if (diceIndices.length > 0) {
      result.push({ ...assignment, diceIndices });
    }
  }
  return result;
}

function appendDiceToCard(
  assignments: DiceAssignmentInput[],
  state: State,
  cardName: string,
  diceIndex: number,
): DiceAssignmentInput[] {
  const without = removeDiceFromAssignments(assignments, diceIndex);
  const existing = without.find((a) => a.state === state && a.cardName === cardName);
  if (existing) {
    if (existing.diceIndices.includes(diceIndex)) {
      return without;
    }
    return without.map((a) =>
      a === existing ? { ...a, diceIndices: [...a.diceIndices, diceIndex] } : a,
    );
  }
  return [...without, { state, cardName, diceIndices: [diceIndex] }];
}

export const useGameStore = defineStore('game', () => {
  const session = shallowRef<GameSession | null>(null);
  const lastError = ref<string | null>(null);
  const revision = ref(0);
  const boardEpoch = ref(0);
  const effortHighlights = ref<Record<string, Partial<Record<EffortField, true>>>>({});
  const diceRollUi = ref<DiceRollUiState | null>(null);
  const releaseEffectEvents = ref<readonly CardEffectEvent[]>([]);

  const hasSession = computed(() => session.value !== null);
  const currentDay = computed(() => {
    void revision.value;
    return session.value?.getCurrentDay() ?? 9;
  });
  const phase = computed(() => {
    void revision.value;
    return session.value?.getPhase() ?? GamePhase.REPLENISH;
  });
  const pendingActions = computed((): readonly PendingAction[] => {
    void revision.value;
    return session.value?.getPendingActions() ?? [];
  });
  const wipCounts = computed(() => {
    void revision.value;
    if (!session.value) {
      return null;
    }
    return captureWipCounts(session.value.getBoard());
  });
  const board = computed((): Board | null => {
    void revision.value;
    return session.value?.getBoard() ?? null;
  });
  const wipAdjustments = computed(() => {
    void revision.value;
    return session.value?.getBoard().getWipAdjustments() ?? [];
  });
  const boardView = computed(() => {
    void revision.value;
    if (!session.value) {
      return null;
    }
    return buildBoardView(session.value.getBoard(), session.value.getCurrentDay());
  });
  const snapshots = computed((): readonly DaySnapshot[] => {
    void revision.value;
    return session.value?.getSnapshots() ?? [];
  });
  const financialSummary = computed((): FinancialSummary | null => {
    void revision.value;
    return session.value?.getFinancialSummary() ?? null;
  });
  const snapshotCount = computed(() => snapshots.value.length);
  const isGameOver = computed(() => {
    void revision.value;
    return session.value?.isGameOver() ?? false;
  });
  const pendingDiceAssignments = computed((): readonly DiceAssignmentInput[] => {
    void revision.value;
    return session.value?.getManualDiceAssignments() ?? [];
  });
  const pendingRollPreview = computed(() => {
    void revision.value;
    const preview = session.value
      ?.getPendingActions()
      .find((action) => action.kind === 'dice-roll-preview');
    if (preview && preview.kind === 'dice-roll-preview') {
      return preview.steps;
    }
    return session.value?.getPendingRollSteps() ?? [];
  });
  const appliedRollCount = computed(() => {
    void revision.value;
    return session.value?.getAppliedRollCount() ?? 0;
  });
  const diceRollLog = computed(() => {
    void revision.value;
    return session.value?.getDiceRollLog() ?? [];
  });
  const diceRollArchiveSize = ref(diceRollArchiveCount());
  const replayServerStatus = ref<ReplaySyncStatus>('idle');
  const replaySessionId = ref(getReplaySessionId());
  const activePlaySessionId = ref(getActivePlaySessionId());
  const systemLogSize = ref(gameEventLogCount());

  const isDiceRollActive = computed(() => diceRollUi.value?.visible === true);

  function setDiceRollApplying(index: number): void {
    if (!diceRollUi.value) {
      return;
    }
    diceRollUi.value = {
      ...diceRollUi.value,
      activeIndex: index,
    };
  }

  function closeDiceRollUi(): void {
    diceRollUi.value = null;
  }

  async function runDiceRollAnimation(activeTab: AppTab = 'board'): Promise<void> {
    const steps = session.value?.getPendingRollSteps() ?? [];
    if (steps.length === 0) {
      return;
    }

    diceRollUi.value = {
      visible: true,
      phase: 'applying',
      steps: [...steps],
      activeIndex: 0,
    };

    const start = session.value?.getAppliedRollCount() ?? 0;
    for (let index = start; index < steps.length; index += 1) {
      setDiceRollApplying(index);
      await delay(1050);
      const result = applyRollStep(index, activeTab);
      if (!result?.ok) {
        closeDiceRollUi();
        endDiceDrag();
        return;
      }
      await delay(320);
    }
    closeDiceRollUi();
    endDiceDrag();
  }

  function getCardRollUi(cardName: string): {
    mode: CardRollUiMode;
    step: DiceRollApplyStep;
  } | null {
    const ui = diceRollUi.value;
    if (!ui) {
      return null;
    }
    const stepIndex = ui.steps.findIndex((step) => step.cardName === cardName);
    if (stepIndex < 0) {
      return null;
    }
    const step = ui.steps[stepIndex]!;
    if (stepIndex < ui.activeIndex) {
      return { mode: 'done', step };
    }
    if (stepIndex === ui.activeIndex) {
      return { mode: 'rolling', step };
    }
    return null;
  }

  const canDeployToday = computed(() => {
    void revision.value;
    if (!session.value) {
      return false;
    }
    const day = session.value.getCurrentDay();
    const frequency = session.value.getBoard().getReadyToDeploy().getDeploymentFrequency();
    return day % frequency === 0;
  });

  function clearEffortHighlights(): void {
    effortHighlights.value = {};
  }

  function markEffortHighlight(step: DiceRollApplyStep): void {
    if (step.delta <= 0) {
      return;
    }
    const field = stateToEffortField(step.state);
    effortHighlights.value = {
      ...effortHighlights.value,
      [step.cardName]: {
        ...effortHighlights.value[step.cardName],
        [field]: true,
      },
    };
  }

  function getEffortHighlight(cardName: string): Partial<Record<EffortField, true>> {
    return effortHighlights.value[cardName] ?? {};
  }

  function hasEffortHighlight(cardName: string): boolean {
    const highlight = effortHighlights.value[cardName];
    return Boolean(highlight && Object.keys(highlight).length > 0);
  }

  function persistDiceRollLogEntry(entry: DiceRollLogEntry): void {
    appendDiceRollLogEntry(entry);
    diceRollArchiveSize.value = diceRollArchiveCount();
    void (async () => {
      if (session.value) {
        await syncSessionSnapshot(session.value.toJSON());
      }
      const ok = await pushDiceRollToServer(entry);
      replayServerStatus.value = ok ? 'online' : 'offline';
    })();
  }

  async function refreshReplayServerStatus(): Promise<boolean> {
    replayServerStatus.value = 'syncing';
    const online = await checkReplayServerHealth();
    replayServerStatus.value = online ? 'online' : 'offline';
    return online;
  }

  async function syncReplayToServer(): Promise<boolean> {
    if (!session.value) {
      return false;
    }
    replayServerStatus.value = 'syncing';
    const ok = await syncSessionSnapshot(session.value.toJSON());
    replayServerStatus.value = ok ? 'online' : 'offline';
    return ok;
  }

  async function exportServerReplay(): Promise<void> {
    await syncReplayToServer();
    await downloadReplayFromServer(replaySessionId.value);
  }

  function exportDiceRollLog(): void {
    if (session.value) {
      syncSessionDiceRollLog(session.value.getDiceRollLog());
      diceRollArchiveSize.value = diceRollArchiveCount();
    }
    downloadDiceRollArchive();
  }

  function getDiceRollArchivePreview(): ReturnType<typeof loadDiceRollArchive> {
    syncSessionDiceRollLog(session.value?.getDiceRollLog() ?? []);
    diceRollArchiveSize.value = diceRollArchiveCount();
    return loadDiceRollArchive();
  }

  function logGameEvent(
    entry: Omit<Parameters<typeof appendGameEvent>[0], 'day' | 'phase'> & {
      day?: number;
      phase?: string;
    },
  ): void {
    appendGameEvent({
      day: session.value?.getCurrentDay(),
      phase: session.value?.getPhase(),
      ...entry,
    });
    systemLogSize.value = gameEventLogCount();
  }

  function exportSystemLog(): void {
    downloadGameEventLog();
  }

  const hasSavedGame = ref(false);

  function refreshSavedFlag(): void {
    hasSavedGame.value = loadGame() !== null;
  }

  function persistToStorage(activeTab: AppTab = 'board'): void {
    if (!session.value) {
      return;
    }
    const payload: SavedGamePayload = {
      session: session.value.toJSON(),
      activeTab,
      savedAt: new Date().toISOString(),
    };
    saveGame(payload);
    refreshSavedFlag();
    void syncSessionSnapshot(session.value.toJSON()).then((ok) => {
      replayServerStatus.value = ok ? 'online' : 'offline';
    });
  }

  function loadFromStorage(): AppTab | null {
    const payload = loadGame();
    if (!payload) {
      return null;
    }
    session.value = GameSession.fromJSON(payload.session);
    lastError.value = null;
    syncSessionDiceRollLog(session.value.getDiceRollLog());
    diceRollArchiveSize.value = diceRollArchiveCount();
    void syncReplayToServer();
    bumpRevision();
    refreshSavedFlag();
    const tab = payload.activeTab;
    if (tab === 'control' || (tab as string | undefined) === 'run') {
      return 'control';
    }
    return tab ?? 'board';
  }

  function startNewGame(): void {
    session.value = GameSession.createNew();
    lastError.value = null;
    clearEffortHighlights();
    closeDiceRollUi();
    releaseEffectEvents.value = [];
    clearSavedGame();
    activePlaySessionId.value = null;
    setActivePlaySessionId(null);
    replaySessionId.value = resetReplaySessionId();
    refreshSavedFlag();
    logGameEvent({ level: 'info', category: 'system', message: '新游戏开始' });
    bumpRevision();
  }

  async function startNewGameInPlaySession(playSessionId: string): Promise<boolean> {
    const result = await startPlayInSession(playSessionId);
    if (!result) {
      lastError.value = '无法在该竞赛房中开始游戏';
      return false;
    }
    session.value = GameSession.createNew();
    lastError.value = null;
    clearEffortHighlights();
    closeDiceRollUi();
    releaseEffectEvents.value = [];
    clearSavedGame();
    activePlaySessionId.value = playSessionId;
    setActivePlaySessionId(playSessionId);
    setReplaySessionId(result.gameSessionId);
    replaySessionId.value = result.gameSessionId;
    refreshSavedFlag();
    logGameEvent({ level: 'info', category: 'system', message: '竞赛房游戏开始', detail: { playSessionId } });
    bumpRevision();
    await syncReplayToServer();
    return true;
  }

  function resetGame(): void {
    startNewGame();
  }

  function clearActivePlaySession(): void {
    activePlaySessionId.value = null;
    setActivePlaySessionId(null);
  }

  function dispatch(action: PlayerAction): DispatchResult | undefined {
    if (!session.value) {
      lastError.value = '尚未开始游戏';
      logGameEvent({
        level: 'warn',
        category: 'dispatch',
        message: '尚未开始游戏',
        action: action.type,
      });
      return { ok: false, error: '尚未开始游戏' };
    }
    const prevPhase = session.value.getPhase();
    const currentDay = session.value.getCurrentDay();
    logGameEvent({
      level: 'info',
      category: 'dispatch',
      message: `dispatch ${action.type}`,
      action: action.type,
      day: currentDay,
      phase: prevPhase,
    });
    const result = session.value.dispatch(action);
    boardEpoch.value += 1;
    if (!result.ok) {
      lastError.value = result.error;
      logGameEvent({
        level: 'error',
        category: 'dispatch',
        message: result.error ?? 'dispatch failed',
        action: action.type,
        detail: { prevPhase, ok: false },
      });
    } else {
      lastError.value = null;
      if (result.phase === GamePhase.RELEASE && prevPhase !== GamePhase.RELEASE) {
        releaseEffectEvents.value = consolidateReleaseEffectEvents(result.effects ?? []);
        logGameEvent({
          level: 'info',
          category: 'phase',
          message: `进入发布阶段 Day ${currentDay}`,
          detail: { effects: releaseEffectEvents.value.map((e) => e.message) },
        });
      } else if (result.phase === GamePhase.REPLENISH) {
        releaseEffectEvents.value = [];
        if (prevPhase !== GamePhase.REPLENISH) {
          logGameEvent({
            level: 'info',
            category: 'phase',
            message: `进入准备阶段 Day ${result.phase === GamePhase.REPLENISH ? session.value.getCurrentDay() : currentDay}`,
          });
        }
      } else if (result.effects?.length) {
        releaseEffectEvents.value = consolidateReleaseEffectEvents(
          mergeEffectEvents([...releaseEffectEvents.value], [...result.effects]),
        );
        logGameEvent({
          level: 'info',
          category: 'effect',
          message: `效果事件 x${result.effects.length}`,
          detail: result.effects,
        });
      }
      if (result.phase !== prevPhase && result.phase !== GamePhase.RELEASE && result.phase !== GamePhase.REPLENISH) {
        logGameEvent({
          level: 'info',
          category: 'phase',
          message: `阶段 ${prevPhase} → ${result.phase}`,
          day: session.value.getCurrentDay(),
        });
      }
      if (result.diceRollLogged) {
        logGameEvent({
          level: 'info',
          category: 'dice',
          message: `Day ${result.diceRollLogged.day} 掷骰完成`,
          detail: result.diceRollLogged,
        });
        persistDiceRollLogEntry(result.diceRollLogged);
      }
      bumpRevision();
    }
    return result;
  }

  function bumpRevision(): void {
    revision.value += 1;
  }

  function dispatchAndSave(action: PlayerAction, activeTab: AppTab = 'board'): DispatchResult | undefined {
    const result = dispatch(action);
    if (result?.ok) {
      persistToStorage(activeTab);
    }
    return result;
  }

  function confirmPhase(activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'confirm-phase' }, activeTab);
  }

  function rollDice(activeTab: AppTab = 'board'): DispatchResult | undefined {
    clearEffortHighlights();
    endDiceDrag();
    return dispatchAndSave({ type: 'roll-dice' }, activeTab);
  }

  function applyRollStep(index: number, activeTab: AppTab = 'board'): DispatchResult | undefined {
    const steps = session.value?.getPendingRollSteps() ?? [];
    const step = steps[index];
    const result = dispatchAndSave({ type: 'apply-roll-step', index }, activeTab);
    if (result?.ok && step) {
      markEffortHighlight(step);
    }
    return result;
  }

  function adjustWipLimits(adjustment: WipLimitAdjustment, activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'adjust-wip-limits', adjustment }, activeTab);
  }

  function reorderBacklog(cardNames: string[], activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'reorder-backlog', cardNames }, activeTab);
  }

  function pullToSelected(cardName: string, activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'pull-to-selected', cardName }, activeTab);
  }

  function reorderSelected(cardNames: string[], activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'reorder-selected', cardNames }, activeTab);
  }

  function advanceCard(
    fromColumn: string,
    toColumn: string,
    cardName: string,
    activeTab: AppTab = 'board',
  ): DispatchResult | undefined {
    return dispatchAndSave({ type: 'advance-card', fromColumn, toColumn, cardName }, activeTab);
  }

  function expediteCard(state: State, cardName: string, activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'expedite-card', state, cardName }, activeTab);
  }

  function assignDice(assignments: DiceAssignmentInput[], activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'assign-dice', assignments }, activeTab);
  }

  function sendTedToTraining(training: boolean, activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'send-ted-to-training', training }, activeTab);
  }

  function unassignDice(diceIndex: number, activeTab: AppTab = 'board'): DispatchResult | undefined {
    const die = boardView.value?.unassignedDice.find((item) => item.index === diceIndex);
    if (!die) {
      lastError.value = '找不到该骰子';
      return { ok: false, error: '找不到该骰子' };
    }
    const updated = removeDiceFromAssignments([...pendingDiceAssignments.value], diceIndex);
    return assignDice(updated, activeTab);
  }

  function addDiceToCard(
    state: State,
    cardName: string,
    diceIndex: number,
    activeTab: AppTab = 'board',
  ): DispatchResult | undefined {
    const die = boardView.value?.unassignedDice.find((item) => item.index === diceIndex);
    if (!die) {
      lastError.value = '找不到该骰子';
      return { ok: false, error: '找不到该骰子' };
    }
    const updated = appendDiceToCard(
      [...pendingDiceAssignments.value],
      state,
      cardName,
      diceIndex,
    );
    return assignDice(updated, activeTab);
  }

  function checkAdvance(fromColumn: string, toColumn: string, cardName: string) {
    if (!session.value) {
      return { ok: false as const, reason: '尚未开始游戏' };
    }
    return session.value.canAdvanceCard(fromColumn, toColumn, cardName);
  }

  function checkPullToSelected(cardName: string) {
    if (!session.value) {
      return { ok: false as const, reason: '尚未开始游戏' };
    }
    return session.value.getBoard().canPullToSelected(cardName);
  }

  function getAssignedDiceForCard(cardName: string): AssignedDiceView[] {
    if (!boardView.value) {
      return [];
    }
    const result: AssignedDiceView[] = [];
    for (const assignment of pendingDiceAssignments.value) {
      if (assignment.cardName !== cardName) {
        continue;
      }
      for (const index of assignment.diceIndices) {
        const die = boardView.value.unassignedDice[index];
        if (die) {
          result.push({ index, label: die.label, state: die.state });
        }
      }
    }
    return result;
  }

  return {
    session,
    lastError,
    boardEpoch,
    hasSession,
    currentDay,
    phase,
    pendingActions,
    wipCounts,
    board,
    wipAdjustments,
    boardView,
    snapshots,
    financialSummary,
    snapshotCount,
    isGameOver,
    hasSavedGame,
    pendingDiceAssignments,
    pendingRollPreview,
    appliedRollCount,
    diceRollLog,
    diceRollArchiveSize,
    replayServerStatus,
    replaySessionId,
    activePlaySessionId,
    systemLogSize,
    effortHighlights,
    diceRollUi,
    releaseEffectEvents,
    isDiceRollActive,
    runDiceRollAnimation,
    setDiceRollApplying,
    closeDiceRollUi,
    getCardRollUi,
    canDeployToday,
    startNewGame,
    startNewGameInPlaySession,
    resetGame,
    clearActivePlaySession,
    exportDiceRollLog,
    exportServerReplay,
    exportSystemLog,
    refreshReplayServerStatus,
    syncReplayToServer,
    getDiceRollArchivePreview,
    persistToStorage,
    loadFromStorage,
    refreshSavedFlag,
    dispatch,
    dispatchAndSave,
    confirmPhase,
    rollDice,
    applyRollStep,
    adjustWipLimits,
    reorderBacklog,
    pullToSelected,
    reorderSelected,
    advanceCard,
    expediteCard,
    assignDice,
    sendTedToTraining,
    addDiceToCard,
    unassignDice,
    getAssignedDiceForCard,
    checkAdvance,
    checkPullToSelected,
    getEffortHighlight,
    hasEffortHighlight,
    clearEffortHighlights,
  };
});
