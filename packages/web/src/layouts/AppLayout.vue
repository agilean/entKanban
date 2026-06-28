<script setup lang="ts">
import { ENGINE_VERSION } from '@kanban-game/engine';
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useUiStore, type AppTab } from '../stores/uiStore';
import UserMenu from '../components/layout/UserMenu.vue';
import { phaseLabel } from '../utils/phaseLabel';

const game = useGameStore();
const ui = useUiStore();
const auth = useAuthStore();

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: 'board', label: '看板' },
  { id: 'cfd', label: 'CFD' },
  { id: 'control', label: '控制图' },
  { id: 'leadtime', label: '前置时间' },
  { id: 'finance', label: '财务' },
];

const subtitle = computed(() => {
  if (!game.hasSession) {
    return game.hasSavedGame ? '发现本地存档，点击「读档」继续' : '点击「新游戏」从 Day 9 开始';
  }
  return `Day ${game.currentDay} · ${phaseLabel(game.phase)}`;
});

const isDev = import.meta.env.DEV;

const replayStatusLabel = computed(() => {
  switch (game.replayServerStatus) {
    case 'online':
      return '回放库已连接';
    case 'offline':
      return '回放库离线';
    case 'syncing':
      return '同步中…';
    default:
      return '回放库';
  }
});

onMounted(() => {
  void game.refreshReplayServerStatus();
  if (!auth.initialized) {
    void auth.initialize();
  }
});

function handleExportSystemLog(): void {
  game.exportSystemLog();
}

function handleExportServerReplay(): void {
  void game.exportServerReplay().catch((error: unknown) => {
    window.alert(error instanceof Error ? error.message : '导出回放失败');
  });
}

function handleExportDiceLog(): void {
  game.exportDiceRollLog();
}

function handleSave(): void {
  game.persistToStorage(ui.activeTab);
}

function handleLoad(): void {
  const tab = game.loadFromStorage();
  if (tab) {
    ui.setTab(tab);
  }
}

function handleStartNewGame(): void {
  game.startNewGame();
  ui.setTab('board');
  ui.resetSetupGuideForNewGame();
}

function handleNewGame(): void {
  if (game.hasSession && !window.confirm('开始新游戏将清除当前进度，确定吗？')) {
    return;
  }
  game.resetGame();
  ui.setTab('board');
  ui.resetSetupGuideForNewGame();
}

function handleOpenGuide(): void {
  ui.setTab('board');
  ui.openSetupGuide();
}
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="brand">
        <h1>getKanban Game</h1>
        <p class="subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-actions">
        <UserMenu />
        <RouterLink v-if="isDev" to="/evacuation" class="dev-link">疏散模拟</RouterLink>
        <span class="version">Engine {{ ENGINE_VERSION }}</span>
        <span
          v-if="game.hasSession"
          class="replay-status"
          :class="game.replayServerStatus"
          :title="`Session ${game.replaySessionId}`"
        >
          {{ replayStatusLabel }}
        </span>
        <template v-if="game.hasSession">
          <button type="button" class="btn" @click="handleOpenGuide">游戏说明</button>
          <button type="button" class="btn" @click="handleExportSystemLog">
            导出系统日志{{ game.systemLogSize > 0 ? ` (${game.systemLogSize})` : '' }}
          </button>
          <button type="button" class="btn" @click="handleExportServerReplay">导出服务器回放</button>
          <button type="button" class="btn" @click="handleExportDiceLog">
            导出骰子日志{{ game.diceRollArchiveSize > 0 ? ` (${game.diceRollArchiveSize})` : '' }}
          </button>
          <button type="button" class="btn" @click="handleSave">存档</button>
          <button v-if="game.hasSavedGame" type="button" class="btn" @click="handleLoad">读档</button>
          <button type="button" class="btn" @click="handleNewGame">新游戏</button>
        </template>
        <button v-else type="button" class="btn primary" @click="handleStartNewGame">
          新游戏
        </button>
        <button
          v-if="!game.hasSession && game.hasSavedGame"
          type="button"
          class="btn"
          @click="handleLoad"
        >
          读档
        </button>
      </div>
    </header>

    <nav class="tabs" aria-label="视图导航">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab"
        :class="{ active: ui.activeTab === tab.id }"
        @click="ui.setTab(tab.id)"
      >
        {{ tab.label }}
      </button>
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

.replay-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
}

.replay-status.online {
  background: #ecfdf5;
  color: #047857;
}

.replay-status.offline {
  background: #fef2f2;
  color: #b91c1c;
}

.replay-status.syncing {
  background: #eff6ff;
  color: #1d4ed8;
}

.dev-link {
  font-size: 0.75rem;
  color: #94a3b8;
  text-decoration: none;
}

.nav-link {
  font-size: 0.875rem;
  color: #475569;
  text-decoration: none;
}

.nav-link:hover {
  color: #2563eb;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  object-fit: cover;
}

.user-name {
  font-size: 0.875rem;
  color: #334155;
}

.btn.subtle {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.dev-link:hover {
  color: #6366f1;
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
  border: none;
  background: transparent;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  white-space: nowrap;
  color: #64748b;
  cursor: pointer;
}

.tab.active {
  background: #e0e7ff;
  color: #3730a3;
  font-weight: 600;
}

.content {
  flex: 1;
  padding: 1.5rem;
}
</style>
