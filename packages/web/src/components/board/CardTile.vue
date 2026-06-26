<script setup lang="ts">
import { computed } from 'vue';
import type { CardView } from '../../utils/buildBoardView';

const props = defineProps<{
  card: CardView;
  draggable?: boolean;
  droppable?: boolean;
  assignedDice?: string[];
}>();

const emit = defineEmits<{
  dragStart: [event: DragEvent, cardName: string];
  diceDrop: [event: DragEvent, cardName: string];
}>();

const kindLabels: Record<CardView['kind'], string> = {
  standard: 'Std',
  expedite: 'Exp',
  'fixed-date': 'Fix',
  intangible: 'Int',
};

const isDragEnabled = computed(() => props.draggable === true);
const isDropEnabled = computed(() => props.droppable === true);

function handleDragStart(event: DragEvent): void {
  if (!isDragEnabled.value) {
    event.preventDefault();
    return;
  }
  emit('dragStart', event, props.card.name);
}

function handleDragOver(event: DragEvent): void {
  if (!isDropEnabled.value) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

function handleDrop(event: DragEvent): void {
  if (!isDropEnabled.value) {
    return;
  }
  event.preventDefault();
  emit('diceDrop', event, props.card.name);
}
</script>

<template>
  <article
    class="card-tile"
    :class="{
      [`kind-${card.kind}`]: true,
      draggable: isDragEnabled,
      droppable: isDropEnabled,
    }"
    :draggable="isDragEnabled"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <header class="card-header">
      <span class="card-name">{{ card.name }}</span>
      <span class="card-kind">{{ kindLabels[card.kind] }}</span>
    </header>

    <div class="effort" aria-label="剩余工作量">
      <span v-if="card.effort.analysis > 0" class="effort-item analysis">A {{ card.effort.analysis }}</span>
      <span v-if="card.effort.development > 0" class="effort-item development">D {{ card.effort.development }}</span>
      <span v-if="card.effort.test > 0" class="effort-item test">T {{ card.effort.test }}</span>
      <span
        v-if="card.effort.analysis === 0 && card.effort.development === 0 && card.effort.test === 0"
        class="effort-done"
      >
        ✓
      </span>
    </div>

    <div v-if="assignedDice && assignedDice.length > 0" class="assigned-dice">
      <span v-for="(label, idx) in assignedDice" :key="idx" class="dice-badge">{{ label }}</span>
    </div>

    <footer v-if="card.blocked || card.dueDate" class="card-footer">
      <span v-if="card.blocked" class="blocker">Blocker {{ card.blockerRemaining }}</span>
      <span v-if="card.dueDate" class="due-date">Due D{{ card.dueDate }}</span>
    </footer>
  </article>
</template>

<style scoped>
.card-tile {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fff;
  padding: 0.5rem 0.625rem;
  font-size: 0.75rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
}

.card-tile.draggable {
  cursor: grab;
}

.card-tile.draggable:active {
  cursor: grabbing;
  opacity: 0.75;
}

.card-tile.droppable {
  outline: 1px dashed transparent;
  transition: outline-color 0.15s, background 0.15s;
}

.card-tile.droppable:hover {
  outline-color: #93c5fd;
  background: #f0f9ff;
}

.kind-standard {
  border-left: 3px solid #3b82f6;
}

.kind-expedite {
  border-left: 3px solid #ef4444;
  background: #fef2f2;
}

.kind-fixed-date {
  border-left: 3px solid #f59e0b;
  background: #fffbeb;
}

.kind-intangible {
  border-left: 3px solid #8b5cf6;
  background: #f5f3ff;
  border-style: dashed;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.25rem;
}

.card-name {
  font-weight: 700;
  color: #1e293b;
}

.card-kind {
  font-size: 0.625rem;
  color: #64748b;
  text-transform: uppercase;
}

.effort {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
}

.effort-item {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.6875rem;
}

.effort-item.analysis {
  background: #dbeafe;
  color: #1d4ed8;
}

.effort-item.development {
  background: #dcfce7;
  color: #15803d;
}

.effort-item.test {
  background: #fef3c7;
  color: #b45309;
}

.effort-done {
  color: #16a34a;
  font-weight: 700;
}

.assigned-dice {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
}

.dice-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #334155;
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
}

.card-footer {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.375rem;
  flex-wrap: wrap;
}

.blocker {
  background: #fce7f3;
  color: #be185d;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
}

.due-date {
  background: #ffedd5;
  color: #c2410c;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
}
</style>
