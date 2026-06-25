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

  function startNewGame(): void {
    session.value = GameSession.createNew();
    lastError.value = null;
    bumpRevision();
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

  function confirmPhase(): DispatchResult | undefined {
    return dispatch({ type: 'confirm-phase' });
  }

  function adjustWipLimits(adjustment: WipLimitAdjustment): DispatchResult | undefined {
    return dispatch({ type: 'adjust-wip-limits', adjustment });
  }

  function reorderBacklog(cardNames: string[]): DispatchResult | undefined {
    return dispatch({ type: 'reorder-backlog', cardNames });
  }

  function expediteCard(state: State, cardName: string): DispatchResult | undefined {
    return dispatch({ type: 'expedite-card', state, cardName });
  }

  function assignDice(assignments: DiceAssignmentInput[]): DispatchResult | undefined {
    return dispatch({ type: 'assign-dice', assignments });
  }

  function sendTedToTraining(training: boolean): DispatchResult | undefined {
    return dispatch({ type: 'send-ted-to-training', training });
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
    startNewGame,
    dispatch,
    confirmPhase,
    adjustWipLimits,
    reorderBacklog,
    expediteCard,
    assignDice,
    sendTedToTraining,
  };
});
