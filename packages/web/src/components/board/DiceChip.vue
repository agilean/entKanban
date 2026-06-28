<script setup lang="ts">
import { State } from '@kanban-game/engine';
import { computed } from 'vue';
import type { DiceView } from '../../utils/buildBoardView';
import { useIsMobile } from '../../composables/useIsMobile';
import { useUiStore } from '../../stores/uiStore';
import { beginDiceDrag, endDiceDrag } from '../../utils/diceDragState';
import { DICE_INDEX_MIME } from '../../utils/dragPayload';

const props = defineProps<{
  dice: DiceView;
  draggable?: boolean;
  crossRole?: boolean;
}>();

const emit = defineEmits<{
  dragStart: [event: DragEvent, diceIndex: number];
  tap: [diceIndex: number];
}>();

const ui = useUiStore();
const { isMobile } = useIsMobile();

const isDraggable = computed(() => props.draggable === true);
const isSelected = computed(() => ui.selectedDiceIndex === props.dice.index);
const isCrossRole = computed(() => props.crossRole === true);

const titleText = computed(() =>
  isCrossRole.value ? `${props.dice.label} · 跨岗分配，点数减半` : props.dice.state,
);

function handleDragStart(event: DragEvent): void {
  if (!isDraggable.value) {
    event.preventDefault();
    return;
  }
  event.stopPropagation();
  beginDiceDrag(props.dice.index);
  event.dataTransfer?.setData(DICE_INDEX_MIME, String(props.dice.index));
  event.dataTransfer?.setData('text/plain', String(props.dice.index));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
  emit('dragStart', event, props.dice.index);
}

function handleDragEnd(): void {
  endDiceDrag();
}

function handleTap(event: MouseEvent): void {
  if (!isMobile.value || !isDraggable.value) {
    return;
  }
  event.stopPropagation();
  if (ui.selectedDiceIndex === props.dice.index) {
    ui.clearSelectedDiceIndex();
    return;
  }
  ui.setSelectedDiceIndex(props.dice.index);
  ui.showDragToast('点击卡片分配骰子');
  emit('tap', props.dice.index);
}

const stateClass: Record<State, string> = {
  [State.ANALYSIS]: 'analysis',
  [State.DEVELOPMENT]: 'development',
  [State.TEST]: 'test',
};
</script>

<template>
  <span
    class="dice-chip"
    :class="[
      stateClass[dice.state],
      {
        draggable: isDraggable,
        selected: isSelected,
        'mobile-tap': isMobile && isDraggable,
        'cross-role': isCrossRole,
      },
    ]"
    :title="titleText"
    :draggable="isDraggable && !isMobile"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="handleTap"
  >
    <span class="dice-label">{{ dice.label }}</span>
  </span>
</template>

<style scoped>
.dice-chip {
  position: relative;
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
  touch-action: none;
  overflow: hidden;
}

.dice-label {
  position: relative;
  z-index: 1;
  line-height: 1;
}

.dice-chip.cross-role {
  background: #e2e8f0;
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 12%);
}

.dice-chip.cross-role::before {
  content: '';
  position: absolute;
  inset: 0;
  width: 50%;
  border-radius: 999px 0 0 999px;
}

.dice-chip.cross-role.analysis::before {
  background: #2563eb;
}

.dice-chip.cross-role.development::before {
  background: #16a34a;
}

.dice-chip.cross-role.test::before {
  background: #d97706;
}

.dice-chip.cross-role::after {
  content: '½';
  position: absolute;
  right: 0.0625rem;
  bottom: 0;
  font-size: 0.5rem;
  font-weight: 800;
  color: #64748b;
  line-height: 1;
  z-index: 1;
}

.dice-chip.mobile-tap {
  cursor: pointer;
  min-width: 2rem;
  min-height: 2rem;
}

.dice-chip.selected {
  box-shadow: 0 0 0 3px #dbeafe;
  transform: scale(1.08);
}

.dice-chip.cross-role.selected {
  box-shadow:
    0 0 0 3px #dbeafe,
    inset 0 0 0 1px rgb(15 23 42 / 12%);
}

.dice-chip.draggable {
  cursor: grab;
  z-index: 2;
}

.dice-chip.draggable:active {
  cursor: grabbing;
  opacity: 0.75;
}

.dice-chip.analysis:not(.cross-role) {
  background: #2563eb;
}

.dice-chip.development:not(.cross-role) {
  background: #16a34a;
}

.dice-chip.test:not(.cross-role) {
  background: #d97706;
}
</style>
