<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import TedTrainingPanel from './TedTrainingPanel.vue';

const game = useGameStore();

const tedTraining = computed(() =>
  game.pendingActions.find((action) => action.kind === 'ted-training'),
);

const hasContent = computed(() => Boolean(tedTraining.value));
</script>

<template>
  <aside v-if="hasContent" class="decision-panel">
    <header class="panel-header">
      <h2>辅助操作</h2>
    </header>

    <div class="sections">
      <TedTrainingPanel v-if="tedTraining" />

      <p v-if="game.isGameOver" class="game-over">游戏已结束，感谢游玩！</p>
    </div>
  </aside>
</template>

<style scoped>
.decision-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  height: fit-content;
  max-height: calc(100vh - 12rem);
  overflow-y: auto;
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.game-over {
  margin: 0;
  padding: 0.75rem;
  background: #f0fdf4;
  border-radius: 0.5rem;
  color: #166534;
  font-size: 0.875rem;
  text-align: center;
}
</style>
