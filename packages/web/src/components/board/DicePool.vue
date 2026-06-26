<script setup lang="ts">
import { computed } from 'vue';
import { useDragPolicy } from '../../composables/useDragPolicy';
import { useGameStore } from '../../stores/gameStore';
import type { BoardView, DiceView } from '../../utils/buildBoardView';
import { DICE_INDEX_MIME } from '../../utils/dragPayload';
import DiceChip from './DiceChip.vue';

defineProps<{
  board: BoardView;
}>();

const game = useGameStore();
const { canAssignDice } = useDragPolicy();

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
  event.dataTransfer?.setData(DICE_INDEX_MIME, String(diceIndex));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
  }
}
</script>

<template>
  <section v-if="canAssignDice && availableDice.length > 0" class="dice-pool">
    <h3 class="pool-title">分配骰子</h3>
    <p class="pool-hint">也可从各列底部的骰子拖到对应卡片上</p>
    <div class="dice-list">
      <DiceChip
        v-for="die in availableDice"
        :key="die.id"
        :dice="die"
        draggable
        @drag-start="handleDiceDragStart"
      />
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
}
</style>
