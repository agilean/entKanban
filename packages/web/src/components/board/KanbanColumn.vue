<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { useDragPolicy } from '../../composables/useDragPolicy';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import type { CardView, ColumnView } from '../../utils/buildBoardView';
import {
  CARD_NAME_MIME,
  DICE_INDEX_MIME,
  isCardAdvanceDrag,
  isDiceDrag,
  isExpediteCardDrag,
  readAdvanceDrag,
  readDiceIndex,
} from '../../utils/dragPayload';
import { beginDiceDrag } from '../../utils/diceDragState';
import { endCardDrag } from '../../utils/cardDragState';
import CardTile from './CardTile.vue';
import DiceChip from './DiceChip.vue';

const props = defineProps<{
  column: ColumnView;
}>();

const game = useGameStore();
const ui = useUiStore();
const {
  canReorderBacklog,
  canPullToSelected,
  canAdvanceFlow,
  canExpedite,
  canAssignDice,
  isExpediteEligible,
  isColumnInteractive,
  canDropDiceOnCard,
} = useDragPolicy();

const STATE_COLUMN_IDS = new Set(['analysis', 'development', 'test']);

const ADVANCE_DROP_COLUMNS = new Set(['analysis', 'development', 'test', 'ready', 'deployed']);

const canReceiveAdvanceDrop = computed(
  () => canAdvanceFlow.value && ADVANCE_DROP_COLUMNS.has(props.column.id),
);

const localCards = ref<CardView[]>([...props.column.cards]);
const expediteDragOver = ref(false);
const advanceDragOver = ref(false);
const advanceDropState = ref<'valid' | 'invalid' | null>(null);
const advanceDropReason = ref('');
const diceRowDragOver = ref(false);
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

const selectedHasWipSpace = computed(() => {
  const selected = props.column.id === 'selected'
    ? props.column
    : game.boardView?.columns.find((item) => item.id === 'selected');
  if (!selected || selected.limitLabel === '∞') {
    return true;
  }
  const limit = Number(selected.limitLabel);
  return selected.count < limit;
});

const selectedGroup = computed(() => ({
  name: 'replenish',
  pull: false,
  put: () => canPullToSelected.value && selectedHasWipSpace.value,
}));

function onBacklogDragStart(event: { oldIndex: number }): void {
  pendingPullCardName.value = localCards.value[event.oldIndex]?.name ?? null;
}

function onBacklogDragEnd(event: { from: HTMLElement; to: HTMLElement }): void {
  if (event.from !== event.to) {
    const cardName = pendingPullCardName.value;
    pendingPullCardName.value = null;
    if (!cardName || !canPullToSelected.value) {
      return;
    }
    const check = game.checkPullToSelected(cardName);
    if (!check.ok) {
      ui.showDragToast(check.reason);
      return;
    }
    const result = game.pullToSelected(cardName);
    if (!result?.ok && result?.error) {
      ui.showDragToast(result.error);
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
  const cardName = event.dataTransfer?.getData(CARD_NAME_MIME);
  if (!cardName || !isExpediteEligible(props.column.id, cardName)) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'none';
    }
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
  if (!isExpediteEligible(props.column.id, cardName)) {
    ui.showDragToast('该卡片当前不可 Expedite（仅临近到期的固定日期卡或 Expedite 卡可加速）');
    return;
  }
  const result = game.expediteCard(props.column.state, cardName);
  if (!result?.ok && result?.error) {
    ui.showDragToast(result.error);
  }
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

function resetAdvanceDropPreview(): void {
  advanceDragOver.value = false;
  advanceDropState.value = null;
  advanceDropReason.value = '';
}

function evaluateAdvanceDrop(event: DragEvent): boolean {
  if (!canReceiveAdvanceDrop.value || !isCardAdvanceDrag(event)) {
    resetAdvanceDropPreview();
    return false;
  }
  const drag = readAdvanceDrag(event);
  if (!drag) {
    resetAdvanceDropPreview();
    return false;
  }
  const check = game.checkAdvance(drag.fromColumn, props.column.id, drag.cardName);
  if (check.ok) {
    advanceDragOver.value = true;
    advanceDropState.value = 'valid';
    advanceDropReason.value = '';
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    return true;
  }
  advanceDragOver.value = true;
  advanceDropState.value = 'invalid';
  advanceDropReason.value = check.reason;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'none';
  }
  return false;
}

function onAdvanceDragOver(event: DragEvent): void {
  evaluateAdvanceDrop(event);
}

function onColumnDragOver(event: DragEvent): void {
  if (isDiceDrag(event) && canAssignDice.value && STATE_COLUMN_IDS.has(props.column.id)) {
    event.preventDefault();
    resetAdvanceDropPreview();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    return;
  }
  onAdvanceDragOver(event);
}

function onColumnDrop(event: DragEvent): void {
  if (isDiceDrag(event)) {
    return;
  }
  onAdvanceDrop(event);
}

function onAdvanceDragLeave(event: DragEvent): void {
  const next = event.relatedTarget as Node | null;
  const current = event.currentTarget as HTMLElement;
  if (next && current.contains(next)) {
    return;
  }
  resetAdvanceDropPreview();
}

function onAdvanceDrop(event: DragEvent): void {
  event.preventDefault();
  const drag = readAdvanceDrag(event);
  resetAdvanceDropPreview();
  endCardDrag();
  if (!canReceiveAdvanceDrop.value || isDiceDrag(event) || !drag) {
    return;
  }
  const check = game.checkAdvance(drag.fromColumn, props.column.id, drag.cardName);
  if (!check.ok) {
    ui.showDragToast(check.reason);
    return;
  }
  const result = game.advanceCard(drag.fromColumn, props.column.id, drag.cardName);
  if (!result?.ok && result?.error) {
    ui.showDragToast(result.error);
  }
}

function assignedDiceFor(cardName: string) {
  return game.getAssignedDiceForCard(cardName);
}

function effortHighlightFor(cardName: string) {
  return game.getEffortHighlight(cardName);
}

function rollUiFor(cardName: string) {
  return game.getCardRollUi(cardName);
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
  beginDiceDrag(diceIndex);
  event.dataTransfer?.setData(DICE_INDEX_MIME, String(diceIndex));
  event.dataTransfer?.setData('text/plain', String(diceIndex));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onDiceRowDragOver(event: DragEvent): void {
  if (!canAssignDice.value || !isDiceDrag(event)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  diceRowDragOver.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onDiceRowDragLeave(event: DragEvent): void {
  const next = event.relatedTarget as Node | null;
  const current = event.currentTarget as HTMLElement;
  if (next && current.contains(next)) {
    return;
  }
  diceRowDragOver.value = false;
}

function onDiceRowDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  diceRowDragOver.value = false;
  if (!canAssignDice.value || !props.column.state) {
    return;
  }
  const diceIndex = readDiceIndex(event);
  if (diceIndex === null) {
    return;
  }
  const die = game.boardView?.unassignedDice.find((item) => item.index === diceIndex);
  if (!die || die.state !== props.column.state) {
    return;
  }
  game.unassignDice(diceIndex);
}

function onCardZoneDragOver(event: DragEvent): void {
  if (!canAssignDice.value || !isDiceDrag(event)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onCardZoneDrop(event: DragEvent, cardName: string): void {
  event.preventDefault();
  event.stopPropagation();
  onCardDiceDrop(event, cardName);
}

function isCardDraggable(cardName: string): boolean {
  return isExpediteEligible(props.column.id, cardName);
}

function isCardDroppable(cardName: string): boolean {
  return canDropDiceOnCard(props.column.id, cardName);
}

const canDeployToday = computed(() => game.canDeployToday());

const interactive = () => isColumnInteractive(props.column.id);
</script>

<template>
  <section
    class="kanban-column"
    :class="{
      interactive: interactive(),
      'advance-drop-target': advanceDragOver,
      'advance-drop-valid': advanceDropState === 'valid',
      'advance-drop-invalid': advanceDropState === 'invalid',
    }"
    @dragover="onColumnDragOver"
    @dragleave="onAdvanceDragLeave"
    @drop="onColumnDrop"
  >
    <header class="column-header">
      <h3>{{ column.title }}</h3>
      <span class="wip">{{ column.count }}/{{ column.limitLabel }}</span>
      <span v-if="column.id === 'ready' && canDeployToday" class="release-badge">发布日</span>
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
            <CardTile
              :card="element"
              :effort-highlight="effortHighlightFor(element.name)"
              :roll-ui="rollUiFor(element.name)"
            />
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
              :effort-highlight="effortHighlightFor(element.name)"
              :roll-ui="rollUiFor(element.name)"
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
          <div
            v-for="card in column.zones.expedite"
            :key="card.id"
            class="card-dice-target"
            @dragover="onCardZoneDragOver"
            @drop="onCardZoneDrop($event, card.name)"
          >
            <CardTile
              :card="card"
              :forward-draggable="isForwardDraggable(card)"
              :from-column="column.id"
              :droppable="isCardDroppable(card.name)"
              :dice-draggable="canAssignDice"
              :assigned-dice="assignedDiceFor(card.name)"
              :effort-highlight="effortHighlightFor(card.name)"
              :roll-ui="rollUiFor(card.name)"
              @dice-drop="onCardDiceDrop"
            />
          </div>
          <p v-if="column.zones.expedite.length === 0" class="zone-empty">拖入临近到期的固定日期卡或 Expedite 卡</p>
        </div>
      </div>

      <div class="zone standard-zone" :class="{ 'zone-drop-preview': advanceDropState === 'valid' }">
        <span class="zone-label">Standard</span>
        <div class="zone-cards">
          <div
            v-for="card in column.zones.standard"
            :key="card.id"
            class="card-dice-target"
            @dragover="onCardZoneDragOver"
            @drop="onCardZoneDrop($event, card.name)"
          >
            <CardTile
              :card="card"
              :draggable="isCardDraggable(card.name)"
              :forward-draggable="isForwardDraggable(card)"
              :from-column="column.id"
              :droppable="isCardDroppable(card.name)"
              :dice-draggable="canAssignDice"
              :assigned-dice="assignedDiceFor(card.name)"
              :effort-highlight="effortHighlightFor(card.name)"
              :roll-ui="rollUiFor(card.name)"
              @drag-start="onCardDragStart"
              @dice-drop="onCardDiceDrop"
            />
          </div>
          <div
            v-if="advanceDropState === 'valid'"
            class="advance-slot"
            aria-hidden="true"
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
            :effort-highlight="effortHighlightFor(card.name)"
            :roll-ui="rollUiFor(card.name)"
          />
        </div>
      </div>

      <footer
        v-if="canAssignDice && column.dice.length > 0"
        class="dice-row"
        :class="{ 'drag-over': diceRowDragOver }"
        @dragover="onDiceRowDragOver"
        @dragleave="onDiceRowDragLeave"
        @drop="onDiceRowDrop"
      >
        <DiceChip
          v-for="die in availableColumnDice"
          :key="die.id"
          :dice="die"
          :draggable="isDiceDraggable(die.index)"
          @drag-start="onDiceDragStart"
        />
      </footer>
      <p v-if="canAssignDice" class="column-hint">
        骰子可在列底、卡片间拖放，或拖回顶栏取消分配
      </p>
      <p v-else-if="canAdvanceFlow" class="column-hint">可将已完成本阶段工作的卡片拖入下一列</p>
      <p
        v-if="advanceDropState === 'invalid' && advanceDropReason && column.zones"
        class="drop-reject-hint"
      >
        {{ advanceDropReason }}
      </p>
    </template>

    <!-- Simple columns (Ready, Deployed) -->
    <template v-else>
      <div class="cards" :class="{ 'cards-drop-preview': advanceDropState === 'valid' }">
        <CardTile
          v-for="card in column.cards"
          :key="card.id"
          :card="card"
          :forward-draggable="isForwardDraggable(card)"
          :from-column="column.id"
          :effort-highlight="effortHighlightFor(card.name)"
          :roll-ui="rollUiFor(card.name)"
        />
        <div
          v-if="advanceDropState === 'valid'"
          class="advance-slot"
          aria-hidden="true"
        />
      </div>
      <p v-if="canAdvanceFlow && column.id === 'ready'" class="column-hint">
        {{ canDeployToday ? '发布日：可将就绪卡片拖入已部署' : '今天不是发布日，请等待下一个发布日' }}
      </p>
      <p
        v-if="advanceDropState === 'invalid' && advanceDropReason"
        class="drop-reject-hint"
      >
        {{ advanceDropReason }}
      </p>
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

.kanban-column.advance-drop-valid {
  border-color: #16a34a;
  background: #f0fdf4;
  box-shadow: inset 0 0 0 2px #bbf7d0;
}

.kanban-column.advance-drop-invalid {
  border-color: #dc2626;
  background: #fef2f2;
  box-shadow: inset 0 0 0 2px #fecaca;
}

.advance-slot {
  min-height: 3.25rem;
  border: 2px dashed #16a34a;
  border-radius: 0.5rem;
  background: rgb(240 253 244 / 70%);
  box-shadow: inset 0 0 0 1px rgb(22 163 74 / 15%);
}

.advance-slot::after {
  content: '放置于此';
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.25rem;
  color: #15803d;
  font-size: 0.6875rem;
  font-weight: 700;
}

.zone-drop-preview,
.cards-drop-preview {
  border-radius: 0.375rem;
}

.standard-zone.zone-drop-preview {
  background: rgb(240 253 244 / 35%);
}

.drop-reject-hint {
  margin: 0 0 0.375rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.35;
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

.release-badge {
  font-size: 0.625rem;
  font-weight: 700;
  color: #15803d;
  background: #dcfce7;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  white-space: nowrap;
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

.card-dice-target {
  border-radius: 0.5rem;
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
  padding: 0.375rem;
  min-height: 2rem;
  border-top: 1px dashed #e2e8f0;
  border-radius: 0.375rem;
  transition: background 0.15s, border-color 0.15s;
}

.dice-row.drag-over {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px #dbeafe;
}
</style>
