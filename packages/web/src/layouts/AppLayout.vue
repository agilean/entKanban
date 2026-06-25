<script setup lang="ts">
import { ENGINE_VERSION } from '@kanban-game/engine';
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { phaseLabel } from '../utils/phaseLabel';

const game = useGameStore();

const subtitle = computed(() => {
  if (!game.hasSession) {
    return '点击「新游戏」从 Day 9 开始';
  }
  return `Day ${game.currentDay} · ${phaseLabel(game.phase)}`;
});
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="brand">
        <h1>getKanban Game</h1>
        <p class="subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-actions">
        <span class="version">Engine {{ ENGINE_VERSION }}</span>
        <button v-if="!game.hasSession" type="button" class="btn primary" @click="game.startNewGame()">
          新游戏
        </button>
        <button
          v-else-if="!game.isGameOver"
          type="button"
          class="btn"
          @click="game.confirmPhase()"
        >
          下一步
        </button>
      </div>
    </header>

    <nav class="tabs" aria-label="视图导航">
      <span class="tab active">看板</span>
      <span class="tab disabled">CFD</span>
      <span class="tab disabled">控制图</span>
      <span class="tab disabled">前置时间</span>
      <span class="tab disabled">Run Chart</span>
      <span class="tab disabled">财务</span>
    </nav>

    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f6f8;
  color: #1a1a2e;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.brand h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.version {
  font-size: 0.75rem;
  color: #94a3b8;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn:hover {
  background: #f8fafc;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn.primary:hover {
  background: #1d4ed8;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}

.tab {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  white-space: nowrap;
}

.tab.active {
  background: #e0e7ff;
  color: #3730a3;
  font-weight: 600;
}

.tab.disabled {
  color: #94a3b8;
}

.content {
  flex: 1;
  padding: 1.5rem;
}
</style>
