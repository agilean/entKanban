<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { useDragPolicy } from '../../composables/useDragPolicy';
import { useGameStore } from '../../stores/gameStore';
import type { CardView, ColumnView } from '../../utils/buildBoardView';
import {
  CARD_NAME_MIME,
  DICE_INDEX_MIME,
  FROM_COLUMN_MIME,
  isCardAdvanceDrag,
  isDiceDrag,
  isExpediteCardDrag,
  readDiceIndex,
} from '../../utils/dragPayload';
import CardTile from './CardTile.vue';
import DiceChip from './DiceChip.vue';

const props = defineProps<{
  column: ColumnView;
}>();

const game = useGameStore();
const {
  canReorderBacklog,
  canPullToSelected,
  canAdvanceFlow,
  canExpedite,
  canAssignDice,
  isExpediteEligible,
  isColumnInteractive,
  canDropDiceOnCard,
  canReceiveAdvance,
} = useDragPolicy();

const ADVANCE_DROP_COLUMNS = new Set(['analysis', 'development', 'test', 'ready', 'deployed']);

const canReceiveAdvanceDrop = computed(
  () => canAdvanceFlow.value && ADVANCE_DROP_COLUMNS.has(props.column.id),
);

const localCards = ref<CardView[]>([...props.column.cards]);
const expediteDragOver = ref(false);
const advanceDragOver = ref(false);
const pendingPullCardName = ref<string | null>(null);

watch(
  [() => props.column.cards, () => game.boardEpoch],
  ([cards]) => {
    localCards.value = [...cards];
  },
);

const replenishGroup = computed(() => ({
  name: 'replenish',
  pull: canPullToSelected.value,
  put: false,
}));

const selectedGroup = computed(() => ({
  name: 'replenish',
  pull: false,
  put: canPullToSelected.value,
}));

function onBacklogDragStart(event: { oldIndex: number }): void {
  pendingPullCardName.value = localCards.value[event.oldIndex]?.name ?? null;
}

function onBacklogDragEnd(event: { from: HTMLElement; to: HTMLElement }): void {
  if (event.from !== event.to) {
    const cardName = pendingPullCardName.value;
    pendingPullCardName.value = null;
    if (cardName && canPullToSelected.value) {
      game.pullToSelected(cardName);
    }
    return;
  }
  pendingPullCardName.value = null;
  game.reorderBacklog(localCards.value.map((item) => item.name));
}

function onSelectedAdd(): void {
  pendingPullCardName.value = null;
}

function onSelectedDragEnd(event: { from: HTMLElement; to: HTMLElement }): void {
  if (event.from !== event.to) {
    return;
  }
  if (canPullToSelected.value) {
    game.reorderSelected(localCards.value.map((item) => item.name));
  }
}

function onCardDragStart(event: DragEvent, cardName: string): void {
  event.dataTransfer?.setData(CARD_NAME_MIME, cardName);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onExpediteDragOver(event: DragEvent): void {
  if (!canExpedite.value || !isExpediteCardDrag(event)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  expediteDragOver.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onExpediteDragLeave(): void {
  expediteDragOver.value = false;
}

function onExpediteDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  expediteDragOver.value = false;
  if (!canExpedite.value || !props.column.state || isDiceDrag(event)) {
    return;
  }
  const cardName = event.dataTransfer?.getData(CARD_NAME_MIME);
  if (!cardName) {
    return;
  }
  game.expediteCard(props.column.state, cardName);
}

function onCardDiceDrop(event: DragEvent, cardName: string): void {
  if (!canAssignDice.value || !props.column.state) {
    return;
  }
  const diceIndex = readDiceIndex(event);
  if (diceIndex === null) {
    return;
  }
  if (!canDropDiceOnCard(props.column.id, cardName, diceIndex)) {
    return;
  }
  game.addDiceToCard(props.column.state, cardName, diceIndex);
}

function isForwardDraggable(card: CardView): boolean {
  return canAdvanceFlow.value && card.advanceable === true;
}

function onAdvanceDragOver(event: DragEvent): void {
  if (!canReceiveAdvanceDrop.value || !isCardAdvanceDrag(event)) {
    return;
  }
  event.preventDefault();
  advanceDragOver.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onAdvanceDragLeave(): void {
  advanceDragOver.value = false;
}

function onAdvanceDrop(event: DragEvent): void {
  event.preventDefault();
  advanceDragOver.value = false;
  if (!canReceiveAdvanceDrop.value || isDiceDrag(event)) {
    return;
  }
  const cardName = event.dataTransfer?.getData(CARD_NAME_MIME);
  const fromColumn = event.dataTransfer?.getData(FROM_COLUMN_MIME);
  if (!cardName || !fromColumn) {
    return;
  }
  if (!canReceiveAdvance(fromColumn, props.column.id)) {
    return;
  }
  game.advanceCard(fromColumn, props.column.id, cardName);
}

function assignedDiceFor(cardName: string): string[] {
  return game.getAssignedDiceLabels(cardName);
}

const assignedDiceIndices = computed(() => {
  const indices = new Set<number>();
  for (const assignment of game.pendingDiceAssignments) {
    for (const index of assignment.diceIndices) {
      indices.add(index);
    }
  }
  return indices;
});

const availableColumnDice = computed(() =>
  props.column.dice.filter((die) => !assignedDiceIndices.value.has(die.index)),
);

function isDiceDraggable(diceIndex: number): boolean {
  return canAssignDice.value && !assignedDiceIndices.value.has(diceIndex);
}

function onDiceDragStart(event: DragEvent, diceIndex: number): void {
  event.dataTransfer?.setData(DICE_INDEX_MIME, String(diceIndex));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
  }
}

function isCardDraggable(cardName: string): boolean {
  return isExpediteEligible(props.column.id, cardName);
}

function isCardDroppable(cardName: string): boolean {
  return canDropDiceOnCard(props.column.id, cardName);
}

const interactive = () => isColumnInteractive(props.column.id);
</script>

<template>
  <section
    class="kanban-column"
    :class="{
      interactive: interactive(),
      'advance-drop-target': advanceDragOver,
    }"
    @dragover="onAdvanceDragOver"
    @dragleave="onAdvanceDragLeave"
    @drop="onAdvanceDrop"
  >
    <header class="column-header">
      <h3>{{ column.title }}</h3>
      <span class="wip">{{ column.count }}/{{ column.limitLabel }}</span>
    </header>

    <!-- Backlog: sort + drag to Selected -->
    <template v-if="column.id === 'backlog'">
      <draggable
        v-model="localCards"
        item-key="id"
        class="cards cards-draggable"
        :group="replenishGroup"
        :disabled="!canReorderBacklog"
        :animation="150"
        ghost-class="sortable-ghost"
        drag-class="sortable-drag"
        @start="onBacklogDragStart"
        @end="onBacklogDragEnd"
      >
        <template #item="{ element }">
          <div class="sortable-card-wrap" :data-card-name="element.name">
            <CardTile :card="element" />
          </div>
        </template>
      </draggable>
      <p v-if="canReorderBacklog" class="column-hint">
        {{ canPullToSelected ? '拖拽排序，或拖入优先列填充' : '拖拽调整存量顺序' }}
      </p>
    </template>

    <!-- Selected: receive from Backlog + reorder -->
    <template v-else-if="column.id === 'selected'">
      <draggable
        v-model="localCards"
        item-key="id"
        class="cards cards-droppable"
        :class="{ 'drop-active': canPullToSelected, 'cards-draggable': canPullToSelected }"
        :group="selectedGroup"
        :sort="canPullToSelected"
        :disabled="!canPullToSelected"
        :animation="150"
        ghost-class="sortable-ghost"
        drag-class="sortable-drag"
        @add="onSelectedAdd"
        @end="onSelectedDragEnd"
      >
        <template #item="{ element }">
          <div class="sortable-card-wrap" :data-card-name="element.name">
            <CardTile
              :card="element"
              :forward-draggable="isForwardDraggable(element)"
              from-column="selected"
            />
          </div>
        </template>
      </draggable>
      <p v-if="canPullToSelected || canAdvanceFlow" class="column-hint">
        {{ canPullToSelected ? '拖拽调整优先级，或从存量接收卡片' : '可将卡片拖入分析列' }}
      </p>
    </template>

    <!-- State columns with zones -->
    <template v-else-if="column.zones">
      <div
        class="zone expedite-zone"
        :class="{ 'drop-active': canExpedite, 'drag-over': expediteDragOver }"
        @dragover="onExpediteDragOver"
        @dragleave="onExpediteDragLeave"
        @drop="onExpediteDrop"
      >
        <span class="zone-label">Expedite</span>
        <div class="zone-cards">
          <CardTile
            v-for="card in column.zones.expedite"
            :key="card.id"
            :card="card"
            :forward-draggable="isForwardDraggable(card)"
            :from-column="column.id"
            :droppable="isCardDroppable(card.name)"
            :assigned-dice="assignedDiceFor(card.name)"
            @dice-drop="onCardDiceDrop"
          />
          <p v-if="column.zones.expedite.length === 0" class="zone-empty">拖入可 Expedite 的标准卡</p>
        </div>
      </div>

      <div class="zone standard-zone">
        <span class="zone-label">Standard</span>
        <div class="zone-cards">
          <CardTile
            v-for="card in column.zones.standard"
            :key="card.id"
            :card="card"
            :draggable="isCardDraggable(card.name)"
            :forward-draggable="isForwardDraggable(card)"
            :from-column="column.id"
            :droppable="isCardDroppable(card.name)"
            :assigned-dice="assignedDiceFor(card.name)"
            @drag-start="onCardDragStart"
            @dice-drop="onCardDiceDrop"
          />
        </div>
      </div>

      <div v-if="column.zones.done.length > 0" class="zone done-zone">
        <span class="zone-label">Done</span>
        <div class="zone-cards">
          <CardTile
            v-for="card in column.zones.done"
            :key="card.id"
            :card="card"
            :forward-draggable="isForwardDraggable(card)"
            :from-column="column.id"
          />
        </div>
      </div>

      <footer v-if="availableColumnDice.length > 0" class="dice-row">
        <DiceChip
          v-for="die in availableColumnDice"
          :key="die.id"
          :dice="die"
          :draggable="isDiceDraggable(die.index)"
          @drag-start="onDiceDragStart"
        />
      </footer>
      <p v-if="canAssignDice" class="column-hint">将列底骰子拖到本列卡片上</p>
      <p v-else-if="canAdvanceFlow" class="column-hint">可将已完成本阶段工作的卡片拖入下一列</p>
    </template>

    <!-- Simple columns (Ready, Deployed) -->
    <template v-else>
      <div class="cards">
        <CardTile
          v-for="card in column.cards"
          :key="card.id"
          :card="card"
          :forward-draggable="isForwardDraggable(card)"
          :from-column="column.id"
        />
      </div>
      <p v-if="canAdvanceFlow && column.id === 'ready'" class="column-hint">可将卡片拖入已部署列</p>
    </template>
  </section>
</template>

<style scoped>
.kanban-column {
  flex: 0 0 9.5rem;
  min-width: 9.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.625rem;
  max-height: 32rem;
}

.kanban-column.interactive {
  border-color: #93c5fd;
  background: #f8fafc;
  box-shadow: inset 0 0 0 1px #dbeafe;
}

.kanban-column.advance-drop-target {
  border-color: #6366f1;
  background: #eef2ff;
  box-shadow: inset 0 0 0 2px #c7d2fe;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.25rem;
}

.column-header h3 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.wip {
  font-size: 0.6875rem;
  color: #64748b;
  font-weight: 600;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow-y: auto;
  flex: 1;
  min-height: 2rem;
}

.cards-draggable :deep(.sortable-card-wrap) {
  cursor: grab;
}

.cards-draggable :deep(.sortable-card-wrap:active) {
  cursor: grabbing;
}

.cards-droppable.drop-active {
  min-height: 4rem;
  border: 1px dashed #93c5fd;
  border-radius: 0.375rem;
  background: #f0f9ff;
  padding: 0.25rem;
}

.column-hint {
  margin: 0;
  font-size: 0.625rem;
  color: #64748b;
  line-height: 1.3;
}

:deep(.sortable-ghost) {
  opacity: 0.45;
}

:deep(.sortable-drag) {
  opacity: 0.85;
}

.zone {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.zone-label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.zone-cards {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-height: 1.5rem;
}

.expedite-zone {
  padding: 0.375rem;
  border-radius: 0.375rem;
  border: 1px dashed #fecaca;
  background: #fff;
}

.expedite-zone.drop-active {
  border-color: #f87171;
  background: #fef2f2;
}

.expedite-zone.drag-over {
  border-color: #dc2626;
  background: #fee2e2;
  box-shadow: 0 0 0 2px #fecaca;
}

.standard-zone {
  padding-top: 0.25rem;
}

.done-zone {
  padding-top: 0.25rem;
  opacity: 0.85;
}

.zone-empty {
  margin: 0;
  font-size: 0.625rem;
  color: #94a3b8;
  font-style: italic;
  padding: 0.25rem 0;
}

.dice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed #e2e8f0;
}
</style>
