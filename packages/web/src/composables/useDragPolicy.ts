import { GamePhase, State, isValidAdvance, type PendingAction } from '@kanban-game/engine';
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

export const STATE_COLUMN_IDS = ['analysis', 'development', 'test'] as const;
export type StateColumnId = (typeof STATE_COLUMN_IDS)[number];

const COLUMN_TO_STATE: Record<StateColumnId, State> = {
  analysis: State.ANALYSIS,
  development: State.DEVELOPMENT,
  test: State.TEST,
};

export function columnIdToState(columnId: string): State | null {
  if (!STATE_COLUMN_IDS.includes(columnId as StateColumnId)) {
    return null;
  }
  return COLUMN_TO_STATE[columnId as StateColumnId];
}

export function isStateColumnId(columnId: string): columnId is StateColumnId {
  return STATE_COLUMN_IDS.includes(columnId as StateColumnId);
}

function buildExpediteEligibleMap(
  actions: readonly PendingAction[],
): Map<State, Set<string>> {
  const map = new Map<State, Set<string>>();
  for (const action of actions) {
    if (action.kind === 'expedite') {
      map.set(action.state, new Set(action.eligibleCards));
    }
  }
  return map;
}

export function useDragPolicy() {
  const game = useGameStore();

  const canReorderBacklog = computed(
    () => game.phase === GamePhase.REPLENISH || game.phase === GamePhase.SETUP,
  );

  const canPullToSelected = computed(
    () => game.phase === GamePhase.REPLENISH || game.phase === GamePhase.SETUP,
  );

  const canAdvanceFlow = computed(
    () => game.phase === GamePhase.REPLENISH || game.phase === GamePhase.SETUP,
  );

  const canExpedite = computed(() => game.phase === GamePhase.EXPEDITE);

  const canAssignDice = computed(() => game.phase === GamePhase.ASSIGN_DICE);

  const expediteEligibleByColumn = computed(() =>
    buildExpediteEligibleMap(game.pendingActions),
  );

  function isExpediteEligible(columnId: string, cardName: string): boolean {
    if (!canExpedite.value) {
      return false;
    }
    const state = columnIdToState(columnId);
    if (!state) {
      return false;
    }
    return expediteEligibleByColumn.value.get(state)?.has(cardName) ?? false;
  }

  function isColumnInteractive(columnId: string): boolean {
    if (columnId === 'backlog') {
      return canReorderBacklog.value;
    }
    if (columnId === 'selected') {
      return canPullToSelected.value || canAdvanceFlow.value;
    }
    if (isStateColumnId(columnId)) {
      return canExpedite.value || canAssignDice.value || canAdvanceFlow.value;
    }
    if (columnId === 'ready' || columnId === 'deployed') {
      return canAdvanceFlow.value;
    }
    return false;
  }

  function canReceiveAdvance(fromColumn: string, toColumn: string): boolean {
    return canAdvanceFlow.value && isValidAdvance(fromColumn, toColumn);
  }

  function canDropDiceOnCard(columnId: string, cardName: string): boolean {
    if (!canAssignDice.value) {
      return false;
    }
    const state = columnIdToState(columnId);
    if (!state) {
      return false;
    }
    const column = game.boardView?.columns.find((c) => c.id === columnId);
    if (!column?.zones) {
      return false;
    }
    const incomplete = [...column.zones.standard, ...column.zones.expedite];
    return incomplete.some((card) => card.name === cardName);
  }

  return {
    canReorderBacklog,
    canPullToSelected,
    canAdvanceFlow,
    canExpedite,
    canAssignDice,
    expediteEligibleByColumn,
    isExpediteEligible,
    isColumnInteractive,
    canDropDiceOnCard,
    canReceiveAdvance,
    columnIdToState,
  };
}
