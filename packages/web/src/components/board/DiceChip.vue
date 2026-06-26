<script setup lang="ts">
import { State } from '@kanban-game/engine';
import { computed } from 'vue';
import type { DiceView } from '../../utils/buildBoardView';
import { CARD_NAME_MIME, DICE_INDEX_MIME } from '../../utils/dragPayload';

const props = defineProps<{
  dice: DiceView;
  draggable?: boolean;
}>();

const emit = defineEmits<{
  dragStart: [event: DragEvent, diceIndex: number];
}>();

const stateClass: Record<State, string> = {
  [State.ANALYSIS]: 'analysis',
  [State.DEVELOPMENT]: 'development',
  [State.TEST]: 'test',
};

const isDraggable = computed(() => props.draggable === true);

function handleDragStart(event: DragEvent): void {
  if (!isDraggable.value) {
    event.preventDefault();
    return;
  }
  event.dataTransfer?.setData(DICE_INDEX_MIME, String(props.dice.index));
  event.dataTransfer?.setData(CARD_NAME_MIME, '');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
  emit('dragStart', event, props.dice.index);
}
</script>

<template>
  <span
    class="dice-chip"
    :class="[stateClass[dice.state], { draggable: isDraggable }]"
    :title="dice.state"
    :draggable="isDraggable"
    @dragstart="handleDragStart"
  >
    {{ dice.label }}
  </span>
</template>

<style scoped>
.dice-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 15%);
}

.dice-chip.draggable {
  cursor: grab;
}

.dice-chip.draggable:active {
  cursor: grabbing;
  opacity: 0.75;
}

.dice-chip.analysis {
  background: #2563eb;
}

.dice-chip.development {
  background: #16a34a;
}

.dice-chip.test {
  background: #d97706;
}
</style>
