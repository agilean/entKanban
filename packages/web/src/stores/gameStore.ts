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

export const useGameStore = defineStore('game', () => {
  const session = shallowRef<GameSession | null>(null);
  const lastError = ref<string | null>(null);
  const revision = ref(0);

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
    return buildBoardView(session.value.getBoard());
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

  function expediteCard(state: State, cardName: string, activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'expedite-card', state, cardName }, activeTab);
  }

  function assignDice(assignments: DiceAssignmentInput[], activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'assign-dice', assignments }, activeTab);
  }

  function sendTedToTraining(training: boolean, activeTab: AppTab = 'board'): DispatchResult | undefined {
    return dispatchAndSave({ type: 'send-ted-to-training', training }, activeTab);
  }

  return {
    session,
    lastError,
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
    expediteCard,
    assignDice,
    sendTedToTraining,
  };
});
