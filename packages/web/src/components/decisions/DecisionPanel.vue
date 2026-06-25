<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import { confirmLabel } from '../../utils/confirmLabel';
import BacklogReorderPanel from './BacklogReorderPanel.vue';
import BlockerRollsPanel from './BlockerRollsPanel.vue';
import DiceAssignPanel from './DiceAssignPanel.vue';
import ExpeditePanel from './ExpeditePanel.vue';
import TedTrainingPanel from './TedTrainingPanel.vue';
import WipAdjustPanel from './WipAdjustPanel.vue';

const game = useGameStore();

const adjustWip = computed(() =>
  game.pendingActions.find((action) => action.kind === 'adjust-wip'),
);
const reorderBacklog = computed(() =>
  game.pendingActions.find((action) => action.kind === 'reorder-backlog'),
);
const expediteActions = computed(() =>
  game.pendingActions.filter((action) => action.kind === 'expedite'),
);
const assignDice = computed(() =>
  game.pendingActions.find((action) => action.kind === 'assign-dice'),
);
const tedTraining = computed(() =>
  game.pendingActions.find((action) => action.kind === 'ted-training'),
);
const blockerRolls = computed(() =>
  game.pendingActions.find((action) => action.kind === 'blocker-rolls'),
);
const confirmAction = computed(() =>
  game.pendingActions.find((action) => action.kind === 'confirm'),
);
</script>

<template>
  <aside class="decision-panel">
    <header class="panel-header">
      <h2>今日决策</h2>
      <p class="meta">根据当前阶段完成操作后点确认继续</p>
    </header>

    <div class="sections">
      <WipAdjustPanel v-if="adjustWip" :remaining="adjustWip.remaining" />

      <BlockerRollsPanel v-if="blockerRolls" :rolls="blockerRolls.rolls" />

      <BacklogReorderPanel
        v-if="reorderBacklog"
        :card-names="reorderBacklog.cardNames"
      />

      <ExpeditePanel
        v-for="action in expediteActions"
        :key="action.state"
        :state="action.state"
        :eligible-cards="action.eligibleCards"
      />

      <DiceAssignPanel v-if="assignDice" :dice-count="assignDice.diceCount" />

      <TedTrainingPanel v-if="tedTraining" />

      <section v-if="confirmAction" class="confirm-section">
        <button type="button" class="btn-confirm" @click="game.confirmPhase()">
          {{ confirmLabel(confirmAction.label) }}
        </button>
      </section>

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

.meta {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.confirm-section {
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn-confirm {
  width: 100%;
  border: none;
  background: #16a34a;
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm:hover {
  background: #15803d;
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
