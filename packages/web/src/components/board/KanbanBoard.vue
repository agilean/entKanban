<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { BoardView } from '../../utils/buildBoardView';
import { endCardDrag } from '../../utils/cardDragState';
import { endDiceDrag } from '../../utils/diceDragState';
import KanbanColumn from './KanbanColumn.vue';

defineProps<{
  board: BoardView;
}>();

function onWindowDragEnd(): void {
  endCardDrag();
  endDiceDrag();
}

onMounted(() => {
  window.addEventListener('dragend', onWindowDragEnd);
});

onUnmounted(() => {
  window.removeEventListener('dragend', onWindowDragEnd);
});
</script>

<template>
  <div class="kanban-board-wrap">
    <div class="kanban-board-area">
      <div class="kanban-board">
        <KanbanColumn
          v-for="column in board.columns"
          :key="column.id"
          :column="column"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-board-wrap {
  display: flex;
  flex-direction: column;
}

.kanban-board-area {
  position: relative;
}

.kanban-board {
  display: flex;
  gap: 0.625rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}
</style>
