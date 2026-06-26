import { GamePhase, State, isValidAdvance } from '@kanban-game/engine';
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

export const STATE_COLUMN_IDS = ['analysis', 'development', 'test'] as const;
export type StateColumnId = (typeof STATE_COLUMN_IDS)[number];

const COLUMN_TO_STATE: Record<StateColumnId, State> = {
  analysis: State.ANALYSIS,
  development: State.DEVELOPMENT,
  test: State.TEST,
};

const STATE_EFFORT_FIELD: Record<State, 'analysis' | 'development' | 'test'> = {
  [State.ANALYSIS]: 'analysis',
  [State.DEVELOPMENT]: 'development',
  [State.TEST]: 'test',
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

export function useDragPolicy() {
  const game = useGameStore();

  const isPreparation = computed(
    () => game.phase === GamePhase.REPLENISH || game.phase === GamePhase.SETUP,
  );

  const isRelease = computed(() => game.phase === GamePhase.RELEASE);

  const canReorderBacklog = computed(() => isPreparation.value);

  const canPullToSelected = computed(() => isPreparation.value);

  const canAdvanceFlow = computed(() => isPreparation.value || isRelease.value);

  const canAssignDice = computed(() => isPreparation.value);

  function isColumnInteractive(columnId: string): boolean {
    if (columnId === 'backlog') {
      return canReorderBacklog.value;
    }
    if (columnId === 'selected') {
      return canPullToSelected.value || isPreparation.value;
    }
    if (isStateColumnId(columnId)) {
      return canAssignDice.value || isPreparation.value;
    }
    if (columnId === 'ready' || columnId === 'deployed') {
      return isRelease.value || isPreparation.value;
    }
    return false;
  }

  function canReceiveAdvance(fromColumn: string, toColumn: string): boolean {
    if (fromColumn === 'ready' && toColumn === 'deployed') {
      return isRelease.value && isValidAdvance(fromColumn, toColumn);
    }
    return isPreparation.value && isValidAdvance(fromColumn, toColumn);
  }

  function canDropDiceOnCard(columnId: string, cardName: string, diceIndex?: number): boolean {
    if (!canAssignDice.value) {
      return false;
    }
    const state = columnIdToState(columnId);
    if (!state) {
      return false;
    }
    const column = game.boardView?.columns.find((c) => c.id === columnId);
    if (!column) {
      return false;
    }
    const card = column.cards.find((item) => item.name === cardName);
    if (!card) {
      return false;
    }
    const effortField = STATE_EFFORT_FIELD[state];
    if (card.effort[effortField] <= 0) {
      return false;
    }
    if (diceIndex === undefined) {
      return true;
    }
    const die = game.boardView?.unassignedDice.find((item) => item.index === diceIndex);
    return die?.state === state;
  }

  return {
    isPreparation,
    isRelease,
    canReorderBacklog,
    canPullToSelected,
    canAdvanceFlow,
    canAssignDice,
    isColumnInteractive,
    canDropDiceOnCard,
    canReceiveAdvance,
    columnIdToState,
  };
}
