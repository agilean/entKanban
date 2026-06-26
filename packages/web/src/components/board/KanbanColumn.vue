<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { useDragPolicy } from '../../composables/useDragPolicy';
import { useGameStore } from '../../stores/gameStore';
import type { CardView, ColumnView } from '../../utils/buildBoardView';
import CardTile from './CardTile.vue';
import DiceChip from './DiceChip.vue';

const props = defineProps<{
  column: ColumnView;
}>();

const game = useGameStore();
const {
  canReorderBacklog,
  canPullToSelected,
  canExpedite,
  canAssignDice,
  isExpediteEligible,
  isColumnInteractive,
  canDropDiceOnCard,
} = useDragPolicy();

const localCards = ref<CardView[]>([...props.column.cards]);
const expediteDragOver = ref(false);

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

function onBacklogDragEnd(event: { from: HTMLElement; to: HTMLElement }): void {
  if (event.from !== event.to) {
    return;
  }
  game.reorderBacklog(localCards.value.map((item) => item.name));
}

function onSelectedAdd(event: { newIndex: number }): void {
  const added = localCards.value[event.newIndex];
  if (!added) {
    return;
  }
  game.pullToSelected(added.name);
}

function onCardDragStart(event: DragEvent, cardName: string): void {
  event.dataTransfer?.setData('text/card-name', cardName);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onExpediteDragOver(event: DragEvent): void {
  if (!canExpedite.value) {
    return;
  }
  event.preventDefault();
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
  expediteDragOver.value = false;
  if (!canExpedite.value || !props.column.state) {
    return;
  }
  const cardName = event.dataTransfer?.getData('text/card-name');
  if (!cardName) {
    return;
  }
  game.expediteCard(props.column.state, cardName);
}

function onCardDiceDrop(event: DragEvent, cardName: string): void {
  if (!canAssignDice.value || !props.column.state) {
    return;
  }
  const indexStr = event.dataTransfer?.getData('text/dice-index');
  if (!indexStr) {
    return;
  }
  const diceIndex = Number.parseInt(indexStr, 10);
  if (Number.isNaN(diceIndex)) {
    return;
  }
  game.addDiceToCard(props.column.state, cardName, diceIndex);
}

function assignedDiceFor(cardName: string): string[] {
  return game.getAssignedDiceLabels(cardName);
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
    :class="{ interactive: interactive() }"
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
        @end="onBacklogDragEnd"
      >
        <template #item="{ element }">
          <div class="sortable-card-wrap">
            <CardTile :card="element" />
          </div>
        </template>
      </draggable>
      <p v-if="canReorderBacklog" class="column-hint">
        {{ canPullToSelected ? '拖拽排序，或拖入 Selected' : '拖拽调整 Backlog 顺序' }}
      </p>
    </template>

    <!-- Selected: receive from Backlog -->
    <template v-else-if="column.id === 'selected'">
      <draggable
        v-model="localCards"
        item-key="id"
        class="cards cards-droppable"
        :class="{ 'drop-active': canPullToSelected }"
        :group="selectedGroup"
        :sort="false"
        :animation="150"
        ghost-class="sortable-ghost"
        @add="onSelectedAdd"
      >
        <template #item="{ element }">
          <div class="sortable-card-wrap">
            <CardTile :card="element" />
          </div>
        </template>
      </draggable>
      <p v-if="canPullToSelected" class="column-hint">从 Backlog 拖入卡片</p>
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
          <CardTile v-for="card in column.zones.done" :key="card.id" :card="card" />
        </div>
      </div>

      <footer v-if="column.dice.length > 0" class="dice-row">
        <DiceChip v-for="die in column.dice" :key="die.id" :dice="die" />
      </footer>
    </template>

    <!-- Simple columns (Ready, Deployed) -->
    <template v-else>
      <div class="cards">
        <CardTile v-for="card in column.cards" :key="card.id" :card="card" />
      </div>
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
