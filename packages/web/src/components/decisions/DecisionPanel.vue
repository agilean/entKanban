<script setup lang="ts">
import { computed } from 'vue';
import { isBillingDay } from '@kanban-game/engine';
import { useGameStore } from '../../stores/gameStore';
import BillingReleasePanel from './BillingReleasePanel.vue';

const game = useGameStore();

const billingSummary = computed(() =>
  game.pendingActions.find((action) => action.kind === 'billing-summary'),
);

const hasContent = computed(() => Boolean(billingSummary.value));

const isDailyRelease = computed(
  () => game.boardView?.columns.find((column) => column.id === 'ready')?.i1DailyDeployActive,
);

const panelTitle = computed(() => {
  if (isDailyRelease.value) {
    return '每日发布';
  }
  if (billingSummary.value?.kind === 'billing-summary' && isBillingDay(billingSummary.value.billingDay)) {
    return '发布与收益';
  }
  return '发布日';
});
</script>

<template>
  <aside v-if="hasContent" class="decision-panel">
    <header class="panel-header">
      <h2>{{ panelTitle }}</h2>
    </header>

    <div class="sections">
      <BillingReleasePanel v-if="billingSummary" />

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
