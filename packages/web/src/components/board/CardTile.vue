<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CardView } from '../../utils/buildBoardView';
import { isDiceDrag } from '../../utils/dragPayload';
import { wipAgeSeverity } from '../../utils/wipAge';
import CardDetailPopover from './CardDetailPopover.vue';

const props = defineProps<{
  card: CardView;
  draggable?: boolean;
  forwardDraggable?: boolean;
  fromColumn?: string;
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
const isForwardDragEnabled = computed(
  () => props.forwardDraggable === true && Boolean(props.fromColumn),
);
const isAnyDragEnabled = computed(() => isDragEnabled.value || isForwardDragEnabled.value);
const isDropEnabled = computed(() => props.droppable === true);
const diceDragActive = ref(false);
const showDetail = ref(false);
const anchorRect = ref<DOMRect | null>(null);

const wipAgeLabel = computed(() => {
  if (props.card.wipDays === undefined || props.card.wipDaysKind === undefined) {
    return null;
  }
  if (props.card.wipDaysKind === 'cycle') {
    return `周期 ${props.card.wipDays}天`;
  }
  return `${props.card.wipDays}天`;
});

const wipAgeClass = computed(() => {
  if (props.card.wipDays === undefined || props.card.wipDaysKind === undefined) {
    return null;
  }
  if (props.card.wipDaysKind === 'cycle') {
    return 'cycle';
  }
  return wipAgeSeverity(props.card.wipDays, 'flow');
});

function handleDragStart(event: DragEvent): void {
  if (isForwardDragEnabled.value) {
    event.dataTransfer?.setData('text/card-name', props.card.name);
    event.dataTransfer?.setData('text/from-column', props.fromColumn ?? '');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    return;
  }
  if (!isDragEnabled.value) {
    event.preventDefault();
    return;
  }
  emit('dragStart', event, props.card.name);
}

function handleDragEnter(event: DragEvent): void {
  if (!isDropEnabled.value || !isDiceDrag(event)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  diceDragActive.value = true;
}

function handleDragLeave(event: DragEvent): void {
  const next = event.relatedTarget as Node | null;
  const current = event.currentTarget as HTMLElement;
  if (next && current.contains(next)) {
    return;
  }
  diceDragActive.value = false;
}

function handleDragOver(event: DragEvent): void {
  if (!isDropEnabled.value || !isDiceDrag(event)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  diceDragActive.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

function handleDrop(event: DragEvent): void {
  diceDragActive.value = false;
  if (!isDropEnabled.value || !isDiceDrag(event)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  emit('diceDrop', event, props.card.name);
}

function openDetail(event: MouseEvent): void {
  event.stopPropagation();
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  anchorRect.value = target.getBoundingClientRect();
  showDetail.value = true;
}

function closeDetail(): void {
  showDetail.value = false;
  anchorRect.value = null;
}
</script>

<template>
  <article
    class="card-tile"
    :class="{
      [`kind-${card.kind}`]: true,
      draggable: isAnyDragEnabled,
      droppable: isDropEnabled,
      'dice-drop-active': diceDragActive,
    }"
    :draggable="isAnyDragEnabled"
    @dragstart="handleDragStart"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <header class="card-header">
      <div class="card-title-row">
        <span class="card-name">{{ card.name }}</span>
        <span
          v-if="wipAgeLabel"
          class="wip-age"
          :class="wipAgeClass ? `wip-age-${wipAgeClass}` : undefined"
          :title="card.wipDaysKind === 'cycle' ? '交付周期' : '自选中以来已流动天数'"
        >
          {{ wipAgeLabel }}
        </span>
      </div>
      <div class="header-actions">
        <button
          type="button"
          class="btn-info"
          title="查看卡片详情"
          aria-label="查看卡片详情"
          @mousedown.stop
          @click="openDetail"
        >
          ⓘ
        </button>
        <span class="card-kind">{{ kindLabels[card.kind] }}</span>
      </div>
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

    <Teleport to="body">
      <CardDetailPopover
        v-if="showDetail && anchorRect"
        :card-name="card.name"
        :anchor-rect="anchorRect"
        @close="closeDetail"
      />
    </Teleport>
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

.card-tile.droppable:hover,
.card-tile.dice-drop-active {
  outline-color: #93c5fd;
  background: #f0f9ff;
}

.card-tile.dice-drop-active {
  outline: 2px dashed #2563eb;
  box-shadow: 0 0 0 2px #dbeafe;
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
  align-items: flex-start;
  gap: 0.25rem;
}

.card-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.card-name {
  font-weight: 700;
  color: #1e293b;
}

.wip-age {
  display: inline-flex;
  align-items: center;
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.wip-age-flow,
.wip-age-fresh {
  background: #f1f5f9;
  color: #475569;
}

.wip-age-aging {
  background: #fef3c7;
  color: #b45309;
}

.wip-age-stale {
  background: #fee2e2;
  color: #b91c1c;
}

.wip-age-cycle {
  background: #ecfdf5;
  color: #047857;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-info {
  border: none;
  background: #f1f5f9;
  color: #475569;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.btn-info:hover {
  background: #e2e8f0;
  color: #1d4ed8;
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
