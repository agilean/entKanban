import {
  captureWipCounts,
  FinancialSummary,
  GamePhase,
  GameSession,
  State,
  WipLimitAdjustment,
  mergeEffectEvents,
  type CardEffectEvent,
  type DaySnapshot,
  type DiceAssignmentInput,
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

  function bumpRevision(): void {
    revision.value += 1;
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
  }

  function loadFromStorage(): AppTab | null {
    const payload = loadGame();
    if (!payload) {
      return null;
    }
    session.value = GameSession.fromJSON(payload.session);
    lastError.value = null;
    bumpRevision();
    refreshSavedFlag();
    return payload.activeTab ?? 'board';
  }

  function startNewGame(): void {
    session.value = GameSession.createNew();
    lastError.value = null;
    clearEffortHighlights();
    closeDiceRollUi();
    releaseEffectEvents.value = [];
    clearSavedGame();
    refreshSavedFlag();
    bumpRevision();
  }

  function resetGame(): void {
    startNewGame();
  }

  function dispatch(action: PlayerAction): DispatchResult | undefined {
    if (!session.value) {
      lastError.value = '尚未开始游戏';
      return { ok: false, error: '尚未开始游戏' };
    }
    const prevPhase = session.value.getPhase();
    const result = session.value.dispatch(action);
    boardEpoch.value += 1;
    if (!result.ok) {
      lastError.value = result.error;
    } else {
      lastError.value = null;
      if (result.effects?.length) {
        if (result.phase === GamePhase.RELEASE && prevPhase === GamePhase.DO_WORK) {
          releaseEffectEvents.value = [...result.effects];
        } else {
          releaseEffectEvents.value = mergeEffectEvents(
            [...releaseEffectEvents.value],
            [...result.effects],
          );
        }
      }
      if (result.phase === GamePhase.REPLENISH && prevPhase === GamePhase.RELEASE) {
        releaseEffectEvents.value = [];
      }
      bumpRevision();
    }
    return result;
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
    if (die.state !== state) {
      lastError.value = '骰子类型与列不匹配';
      return { ok: false, error: '骰子类型与列不匹配' };
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
    return session.value
      .getBoard()
      .canAdvanceCard(fromColumn, toColumn, cardName, session.value.getCurrentDay());
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
    resetGame,
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
