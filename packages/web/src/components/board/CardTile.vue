<script setup lang="ts">
import type { DiceRollApplyStep } from '@kanban-game/engine';
import { State } from '@kanban-game/engine';
import { computed, ref, watch } from 'vue';
import type { AssignedDiceView, CardRollUiMode } from '../../stores/gameStore';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import { useIsMobile } from '../../composables/useIsMobile';
import { columnIdToState, useDragPolicy } from '../../composables/useDragPolicy';
import type { EffortField } from '../../utils/effortHighlight';
import type { CardView } from '../../utils/buildBoardView';
import { beginCardDrag, endCardDrag } from '../../utils/cardDragState';
import { CARD_NAME_MIME, FROM_COLUMN_MIME, isDiceDrag } from '../../utils/dragPayload';
import { wipAgeSeverity } from '../../utils/wipAge';
import CardDetailPopover from './CardDetailPopover.vue';
import DiceChip from './DiceChip.vue';
import RollingDie from './RollingDie.vue';

const props = defineProps<{
  card: CardView;
  draggable?: boolean;
  forwardDraggable?: boolean;
  fromColumn?: string;
  droppable?: boolean;
  diceDraggable?: boolean;
  assignedDice?: AssignedDiceView[];
  effortHighlight?: Partial<Record<EffortField, true>>;
  rollUi?: { mode: CardRollUiMode; step: DiceRollApplyStep } | null;
}>();

const emit = defineEmits<{
  dragStart: [event: DragEvent, cardName: string];
  diceDrop: [event: DragEvent, cardName: string];
}>();

const game = useGameStore();
const ui = useUiStore();
const { isMobile } = useIsMobile();
const { canDropDiceOnCard } = useDragPolicy();

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
const isAnyDragEnabled = computed(() => !isMobile.value && (isDragEnabled.value || isForwardDragEnabled.value));
const isDropEnabled = computed(() => props.droppable === true);
const isDiceDragEnabled = computed(() => props.diceDraggable === true);
const diceDragActive = ref(false);
const showDetail = ref(false);
const anchorRect = ref<DOMRect | null>(null);
const tileRef = ref<HTMLElement | null>(null);

watch(
  () => props.rollUi?.mode,
  (mode) => {
    if (mode === 'rolling') {
      tileRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  },
);

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

const hasEffortUpdate = computed(() => {
  const highlight = props.effortHighlight;
  return Boolean(highlight && Object.keys(highlight).length > 0);
});

const businessValueClass = computed(() => {
  if (!props.card.businessValue) {
    return null;
  }
  const tierMap: Record<string, string> = {
    很高: 'very-high',
    高: 'high',
    中: 'medium',
    低: 'low',
  };
  return tierMap[props.card.businessValue] ?? null;
});

const STATE_ACCENT: Record<State, 'analysis' | 'development' | 'test'> = {
  [State.ANALYSIS]: 'analysis',
  [State.DEVELOPMENT]: 'development',
  [State.TEST]: 'test',
};

const showRollOverlay = computed(() => props.rollUi !== null && props.rollUi !== undefined);

function handleDragStart(event: DragEvent): void {
  if (isForwardDragEnabled.value) {
    beginCardDrag(props.card.name, props.fromColumn ?? '');
    event.dataTransfer?.setData(CARD_NAME_MIME, props.card.name);
    event.dataTransfer?.setData(FROM_COLUMN_MIME, props.fromColumn ?? '');
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

function handleDragEnd(): void {
  endCardDrag();
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
    event.dataTransfer.dropEffect = 'move';
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

const isDiceAssignTarget = computed(() => {
  if (!isMobile.value || ui.selectedDiceIndex === null || !isDropEnabled.value || !props.fromColumn) {
    return false;
  }
  return game.boardView?.unassignedDice.some((item) => item.index === ui.selectedDiceIndex) ?? false;
});

function handleMobileTap(event: MouseEvent): void {
  if (!isMobile.value) {
    return;
  }
  const target = event.target as HTMLElement;
  if (target.closest('.btn-info')) {
    return;
  }
  event.stopPropagation();

  if (ui.selectedDiceIndex !== null && isDropEnabled.value && props.fromColumn) {
    if (!canDropDiceOnCard(props.fromColumn, props.card.name, ui.selectedDiceIndex)) {
      ui.showDragToast('无法分配到该卡片');
      return;
    }
    const state = columnIdToState(props.fromColumn);
    if (!state) {
      return;
    }
    const column = game.boardView?.columns.find((item) => item.id === props.fromColumn);
    const card = column?.cards.find((item) => item.name === props.card.name);
    if (!card || card.effort.analysis + card.effort.development + card.effort.test <= 0) {
      ui.showDragToast('该卡片当前无法分配骰子');
      return;
    }
    game.addDiceToCard(state, props.card.name, ui.selectedDiceIndex);
    ui.clearSelectedDiceIndex();
    return;
  }

  if (props.fromColumn) {
    ui.openMobileCardActions(props.card.name, props.fromColumn);
  }
}
</script>

<template>
  <article
    ref="tileRef"
    class="card-tile"
    :class="{
      [`kind-${card.kind}`]: true,
      draggable: isAnyDragEnabled,
      'mobile-tappable': isMobile && Boolean(fromColumn),
      'dice-assign-target': isDiceAssignTarget,
      droppable: isDropEnabled,
      'dice-drop-active': diceDragActive,
      'effort-updated': hasEffortUpdate,
      'roll-active': rollUi?.mode === 'rolling',
      'roll-done': rollUi?.mode === 'done',
      'advance-ready': isForwardDragEnabled,
    }"
    :draggable="isAnyDragEnabled"
    :title="isForwardDragEnabled ? '可拖入下一阶段' : undefined"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @click="handleMobileTap"
  >
    <header class="card-header">
      <div class="card-title-row">
        <span class="card-name">{{ card.name }}</span>
        <span
          v-if="card.businessValue"
          class="business-value"
          :class="businessValueClass ? `value-${businessValueClass}` : undefined"
          title="价值"
        >
          {{ card.businessValue }}
        </span>
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
      <span
        v-if="card.effort.analysis > 0"
        class="effort-item analysis"
        :class="{ 'effort-changed': effortHighlight?.analysis }"
      >
        A {{ card.effort.analysis }}
      </span>
      <span
        v-if="card.effort.development > 0"
        class="effort-item development"
        :class="{ 'effort-changed': effortHighlight?.development }"
      >
        D {{ card.effort.development }}
      </span>
      <span
        v-if="card.effort.test > 0"
        class="effort-item test"
        :class="{ 'effort-changed': effortHighlight?.test }"
      >
        T {{ card.effort.test }}
      </span>
      <span
        v-if="card.effort.analysis === 0 && card.effort.development === 0 && card.effort.test === 0"
        class="effort-done"
      >
        ✓
      </span>
    </div>

    <div
      v-if="assignedDice && assignedDice.length > 0"
      class="assigned-dice"
      @mousedown.stop
    >
      <DiceChip
        v-for="die in assignedDice"
        :key="die.index"
        :dice="{
          id: `assigned-${die.index}`,
          index: die.index,
          state: die.state,
          label: die.label,
        }"
        :cross-role="die.crossRole"
        :draggable="isDiceDragEnabled"
      />
    </div>

    <div v-if="showRollOverlay && rollUi" class="card-roll-overlay">
      <div class="card-roll-dice">
        <RollingDie
          v-for="(value, index) in rollUi.step.rollValues"
          :key="index"
          :value="value"
          :rolling="rollUi.mode === 'rolling'"
          :accent="STATE_ACCENT[rollUi.step.state]"
          :label="rollUi.step.dieLabels[index]"
        />
      </div>
      <p v-if="rollUi.mode === 'rolling'" class="card-roll-label">掷骰中…</p>
      <p v-else class="card-roll-result">
        <span class="total">合计 {{ rollUi.step.totalRoll }}</span>
        <span v-if="rollUi.step.effortAfter === 0" class="remaining done">完成</span>
        <span v-else class="remaining">剩余 {{ rollUi.step.effortAfter }}</span>
      </p>
    </div>

    <footer v-if="card.dueDate" class="card-footer">
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
  position: relative;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fff;
  padding: 0.5rem 0.625rem;
  font-size: 0.75rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.card-tile.effort-updated {
  border-color: #16a34a;
  box-shadow: 0 0 0 2px #bbf7d0, 0 1px 2px rgb(15 23 42 / 6%);
}

.card-tile.mobile-tappable {
  cursor: pointer;
}

.card-tile.dice-assign-target {
  outline: 2px solid #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
}

.card-tile.draggable {
  cursor: grab;
}

.card-tile.draggable:active {
  cursor: grabbing;
  opacity: 0.75;
}

.card-tile.advance-ready {
  border-color: #86efac;
  background-color: #f7fef9;
  box-shadow: none;
}

.card-tile.advance-ready.kind-expedite {
  background-color: #fff8f8;
  border-color: #86efac;
}

.card-tile.advance-ready.kind-fixed-date {
  background-color: #fffef5;
  border-color: #86efac;
}

.card-tile.advance-ready.kind-intangible {
  background-color: #faf8ff;
  border-color: #86efac;
}

.card-tile.advance-ready.draggable {
  cursor: grab;
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

.business-value {
  display: inline-flex;
  align-items: center;
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.business-value.value-very-high {
  background: #ede9fe;
  color: #5b21b6;
}

.business-value.value-high {
  background: #fee2e2;
  color: #b91c1c;
}

.business-value.value-medium {
  background: #fef3c7;
  color: #b45309;
}

.business-value.value-low {
  background: #f1f5f9;
  color: #64748b;
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

.effort-item.effort-changed {
  color: #dc2626 !important;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgb(220 38 38 / 35%);
  animation: effort-flash 0.8s ease-out;
}

@keyframes effort-flash {
  0% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

.effort-done {
  color: #16a34a;
  font-weight: 700;
}

.card-tile.roll-active {
  box-shadow:
    0 0 0 2px #2563eb,
    0 8px 24px rgb(37 99 235 / 22%);
  z-index: 3;
  transform: scale(1.02);
}

.card-tile.roll-done {
  opacity: 0.92;
}

.card-roll-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(2px);
  animation: overlay-in 0.2s ease-out;
}

.card-roll-dice {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.375rem;
}

.card-roll-label {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 700;
  color: #1e40af;
  letter-spacing: 0.04em;
}

.card-roll-result {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
}

.card-roll-result .total {
  color: #475569;
}

.card-roll-result .remaining {
  color: #1d4ed8;
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
  background: #dbeafe;
  animation: delta-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-roll-result .remaining.done {
  color: #15803d;
  background: #dcfce7;
}

@keyframes overlay-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes delta-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.assigned-dice {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
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
