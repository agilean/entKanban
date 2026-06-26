import {
  captureWipCounts,
  FinancialSummary,
  GamePhase,
  GameSession,
  State,
  WipLimitAdjustment,
  type DaySnapshot,
  type DiceAssignmentInput,
  type DispatchResult,
  type PendingAction,
  type PlayerAction,
} from '@kanban-game/engine';
import type { Board } from '@kanban-game/engine';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { buildBoardView } from '../utils/buildBoardView';
import { clearSavedGame, loadGame, saveGame, type SavedGamePayload } from '../utils/saveGame';
import type { AppTab } from './uiStore';

export type AssignedDiceView = {
  index: number;
  label: string;
  state: State;
};

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

  const hasSession = computed(() => session.value !== null);
  const currentDay = computed(() => session.value?.getCurrentDay() ?? 9);
  const phase = computed(() => session.value?.getPhase() ?? GamePhase.SETUP);
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
    const result = session.value.dispatch(action);
    boardEpoch.value += 1;
    if (!result.ok) {
      lastError.value = result.error;
    } else {
      lastError.value = null;
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
    startNewGame,
    resetGame,
    persistToStorage,
    loadFromStorage,
    refreshSavedFlag,
    dispatch,
    dispatchAndSave,
    confirmPhase,
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
  };
});
