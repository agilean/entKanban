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
  const boardView = computed(() => {
    void revision.value;
    if (!session.value) {
      return null;
    }
    return buildBoardView(session.value.getBoard());
  });
  const snapshotCount = computed(() => {
    void revision.value;
    return session.value?.getSnapshots().length ?? 0;
  });
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

  return {
    session,
    lastError,
    hasSession,
    currentDay,
    phase,
    pendingActions,
    wipCounts,
    boardView,
    snapshotCount,
    isGameOver,
    startNewGame,
    dispatch,
    confirmPhase,
  };
});
