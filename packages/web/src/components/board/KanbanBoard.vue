<script setup lang="ts">
import type { BoardView } from '../../utils/buildBoardView';
import DicePool from './DicePool.vue';
import KanbanColumn from './KanbanColumn.vue';

defineProps<{
  board: BoardView;
}>();
</script>

<template>
  <div class="kanban-board-wrap">
    <DicePool :board="board" />
    <div class="kanban-board">
      <KanbanColumn
        v-for="column in board.columns"
        :key="column.id"
        :column="column"
      />
    </div>
  </div>
</template>

<style scoped>
.kanban-board-wrap {
  display: flex;
  flex-direction: column;
}

.kanban-board {
  display: flex;
  gap: 0.625rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}
</style>
