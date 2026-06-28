<script setup lang="ts">
import { GamePhase } from '@kanban-game/engine';
import { computed, onMounted, watch } from 'vue';
import DragToast from '../components/board/DragToast.vue';
import DayPhaseBar from '../components/board/DayPhaseBar.vue';
import KanbanBoard from '../components/board/KanbanBoard.vue';
import AnalyticsView from '../components/charts/AnalyticsView.vue';
import DecisionPanel from '../components/decisions/DecisionPanel.vue';
import OrgOnboardingPanel from '../components/onboarding/OrgOnboardingPanel.vue';
import PlayOptionsHint from '../components/onboarding/PlayOptionsHint.vue';
import SetupGuide from '../components/onboarding/SetupGuide.vue';
import GameOverSummary from '../components/summary/GameOverSummary.vue';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useUiStore } from '../stores/uiStore';

const game = useGameStore();
const ui = useUiStore();
const auth = useAuthStore();

const showOrgOnboarding = computed(
  () => auth.isLoggedIn && !auth.hasOrg && !ui.orgOnboardingDismissed,
);

const showSidePanel = computed(() => game.phase === GamePhase.RELEASE);

watch(
  () => [game.hasSession, game.currentDay, game.phase] as const,
  ([hasSession, day, phase]) => {
    if (
      hasSession &&
      day === 9 &&
      phase === GamePhase.REPLENISH &&
      !ui.setupGuideDismissed &&
      !ui.setupGuideOpen
    ) {
      ui.openSetupGuide();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
  game.refreshSavedFlag();
  const restoredTab = game.loadFromStorage();
  if (restoredTab) {
    ui.setTab(restoredTab);
  } else if (!game.hasSession) {
    game.startNewGame();
    ui.resetSetupGuideForNewGame();
  }
});

watch(
  () => auth.hasOrg,
  (hasOrg) => {
    if (hasOrg) {
      ui.resetOrgOnboardingDismissed();
    }
  },
);
</script>

<template>
  <AppLayout>
    <SetupGuide />

    <OrgOnboardingPanel v-if="showOrgOnboarding" />
    <PlayOptionsHint />

    <section v-if="!game.hasSession" class="empty">
      <p>正在初始化游戏…</p>
    </section>

    <template v-else>
      <p v-if="game.lastError" class="error">{{ game.lastError }}</p>

      <GameOverSummary v-if="game.isGameOver && !ui.gameOverDismissed" />

      <AnalyticsView v-if="ui.activeTab !== 'board'" />

      <template v-else>
        <DayPhaseBar :phase="game.phase" :current-day="game.currentDay" />

        <div class="game-layout" :class="{ 'with-panel': showSidePanel }">
          <div class="board-area">
            <KanbanBoard v-if="game.boardView" :board="game.boardView" />
          </div>
          <DecisionPanel />
        </div>
        <DragToast />
      </template>
    </template>
  </AppLayout>
</template>

<style scoped>
.game-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: start;
}

.game-layout.with-panel {
  grid-template-columns: 1fr 20rem;
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
  .game-layout.with-panel {
    grid-template-columns: 1fr;
  }
}
</style>
