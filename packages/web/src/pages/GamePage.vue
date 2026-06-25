<script setup lang="ts">
import { onMounted } from 'vue';
import KanbanBoard from '../components/board/KanbanBoard.vue';
import PhaseStepper from '../components/board/PhaseStepper.vue';
import AnalyticsView from '../components/charts/AnalyticsView.vue';
import DecisionPanel from '../components/decisions/DecisionPanel.vue';
import AppLayout from '../layouts/AppLayout.vue';
import { useGameStore } from '../stores/gameStore';
import { useUiStore } from '../stores/uiStore';

const game = useGameStore();
const ui = useUiStore();

onMounted(() => {
  if (!game.hasSession) {
    game.startNewGame();
  }
});
</script>

<template>
  <AppLayout>
    <section v-if="!game.hasSession" class="empty">
      <p>正在初始化游戏…</p>
    </section>

    <template v-else>
      <p v-if="game.lastError" class="error">{{ game.lastError }}</p>

      <AnalyticsView v-if="ui.activeTab !== 'board'" />

      <template v-else>
        <PhaseStepper :phase="game.phase" :current-day="game.currentDay" />

        <div class="game-layout">
          <div class="board-area">
            <KanbanBoard v-if="game.boardView" :board="game.boardView" />
          </div>
          <DecisionPanel />
        </div>
      </template>
    </template>
  </AppLayout>
</template>

<style scoped>
.game-layout {
  display: grid;
  grid-template-columns: 1fr 20rem;
  gap: 1rem;
  align-items: start;
}

.board-area {
  min-width: 0;
  overflow-x: auto;
}

.error {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.875rem;
}

.empty {
  text-align: center;
  color: #64748b;
}

@media (max-width: 960px) {
  .game-layout {
    grid-template-columns: 1fr;
  }
}
</style>
