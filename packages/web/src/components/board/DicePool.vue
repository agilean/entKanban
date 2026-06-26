<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDragPolicy } from '../../composables/useDragPolicy';
import { useGameStore } from '../../stores/gameStore';
import type { BoardView, DiceView } from '../../utils/buildBoardView';
import { beginDiceDrag } from '../../utils/diceDragState';
import { DICE_INDEX_MIME, isDiceDrag, readDiceIndex } from '../../utils/dragPayload';
import DiceChip from './DiceChip.vue';

defineProps<{
  board: BoardView;
}>();

const game = useGameStore();
const { canAssignDice } = useDragPolicy();
const poolDragOver = ref(false);

const assignedIndices = computed(() => {
  const indices = new Set<number>();
  for (const assignment of game.pendingDiceAssignments) {
    for (const index of assignment.diceIndices) {
      indices.add(index);
    }
  }
  return indices;
});

const availableDice = computed((): DiceView[] => {
  if (!game.boardView || !canAssignDice.value) {
    return [];
  }
  return game.boardView.unassignedDice.filter((die) => !assignedIndices.value.has(die.index));
});

function handleDiceDragStart(event: DragEvent, diceIndex: number): void {
  beginDiceDrag(diceIndex);
  event.dataTransfer?.setData(DICE_INDEX_MIME, String(diceIndex));
  event.dataTransfer?.setData('text/plain', String(diceIndex));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onPoolDragOver(event: DragEvent): void {
  if (!canAssignDice.value || !isDiceDrag(event)) {
    return;
  }
  event.preventDefault();
  poolDragOver.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onPoolDragLeave(event: DragEvent): void {
  const next = event.relatedTarget as Node | null;
  const current = event.currentTarget as HTMLElement;
  if (next && current.contains(next)) {
    return;
  }
  poolDragOver.value = false;
}

function onPoolDrop(event: DragEvent): void {
  event.preventDefault();
  poolDragOver.value = false;
  if (!canAssignDice.value) {
    return;
  }
  const diceIndex = readDiceIndex(event);
  if (diceIndex === null) {
    return;
  }
  if (!assignedIndices.value.has(diceIndex)) {
    return;
  }
  game.unassignDice(diceIndex);
}
</script>

<template>
  <section
    v-if="canAssignDice"
    class="dice-pool"
    :class="{ 'drag-over': poolDragOver, empty: availableDice.length === 0 }"
    @dragover="onPoolDragOver"
    @dragleave="onPoolDragLeave"
    @drop="onPoolDrop"
  >
    <h3 class="pool-title">分配骰子</h3>
    <p class="pool-hint">拖到卡片上分配；从卡片或列底拖回此处可取消分配</p>
    <div class="dice-list">
      <DiceChip
        v-for="die in availableDice"
        :key="die.id"
        :dice="die"
        draggable
        @drag-start="handleDiceDragStart"
      />
      <span v-if="availableDice.length === 0" class="pool-empty">拖回已分配的骰子</span>
    </div>
  </section>
</template>

<style scoped>
.dice-pool {
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 1px dashed #93c5fd;
  border-radius: 0.75rem;
  transition: background 0.15s, border-color 0.15s;
}

.dice-pool.drag-over {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: inset 0 0 0 2px #dbeafe;
}

.dice-pool.empty {
  min-height: 3rem;
}

.pool-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #1e293b;
}

.pool-hint {
  margin: 0.25rem 0 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
}

.dice-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
  min-height: 1.75rem;
}

.pool-empty {
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}
</style>
