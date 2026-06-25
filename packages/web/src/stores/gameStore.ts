import {
  captureWipCounts,
  GamePhase,
  GameSession,
  type DispatchResult,
  type PendingAction,
  type PlayerAction,
} from '@kanban-game/engine';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

export const useGameStore = defineStore('game', () => {
  const session = shallowRef<GameSession | null>(null);
  const lastError = ref<string | null>(null);

  const hasSession = computed(() => session.value !== null);
  const currentDay = computed(() => session.value?.getCurrentDay() ?? 9);
  const phase = computed(() => session.value?.getPhase() ?? GamePhase.SETUP);
  const pendingActions = computed((): readonly PendingAction[] => {
    return session.value?.getPendingActions() ?? [];
  });
  const wipCounts = computed(() => {
    if (!session.value) {
      return null;
    }
    return captureWipCounts(session.value.getBoard());
  });
  const snapshotCount = computed(() => session.value?.getSnapshots().length ?? 0);
  const isGameOver = computed(() => session.value?.isGameOver() ?? false);

  function startNewGame(): void {
    session.value = GameSession.createNew();
    lastError.value = null;
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
    }
    return result;
  }

  function confirmPhase(): DispatchResult | undefined {
    return dispatch({ type: 'confirm-phase' });
  }

  return {
    session,
    lastError,
    hasSession,
    currentDay,
    phase,
    pendingActions,
    wipCounts,
    snapshotCount,
    isGameOver,
    startNewGame,
    dispatch,
    confirmPhase,
  };
});
