<script setup lang="ts">
import { ENGINE_VERSION } from '@kanban-game/engine';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useUiStore, type AppTab } from '../stores/uiStore';
import UserMenu from '../components/layout/UserMenu.vue';
import { phaseLabel } from '../utils/phaseLabel';
import {
  fetchPlaySession,
  type PlaySession,
  type PlaySessionStatus,
} from '../utils/playSessionApi';

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

const playSessionInfo = ref<PlaySession | null>(null);
const moreMenuOpen = ref(false);
const newGameMenuOpen = ref(false);
const moreMenuRef = ref<HTMLElement | null>(null);
const newGameMenuRef = ref<HTMLElement | null>(null);

const inPlaySession = computed(() => Boolean(game.activePlaySessionId));
const showSoloPracticeBadge = computed(() => !inPlaySession.value && (game.hasSession || auth.isLoggedIn));

const subtitle = computed(() => {
  if (!game.hasSession) {
    if (inPlaySession.value && playSessionInfo.value) {
      return `竞赛房「${playSessionInfo.value.title}」· 点击「本房再开一局」开始`;
    }
    return game.hasSavedGame ? '发现本地存档，点击「读档」继续' : '点击「新游戏」从 Day 9 开始单人练习';
  }
  return `Day ${game.currentDay} · ${phaseLabel(game.phase)}`;
});

const playSessionStatusLabel = computed(() => {
  const status = playSessionInfo.value?.status;
  if (!status) return '';
  const map: Record<PlaySessionStatus, string> = {
    lobby: '等待开始',
    active: '进行中',
    closed: '已结束',
  };
  return map[status];
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

async function loadPlaySessionInfo(): Promise<void> {
  const id = game.activePlaySessionId;
  if (!id) {
    playSessionInfo.value = null;
    return;
  }
  const data = await fetchPlaySession(id);
  playSessionInfo.value = data?.playSession ?? null;
}

watch(
  () => game.activePlaySessionId,
  () => {
    void loadPlaySessionInfo();
  },
);

onMounted(() => {
  void game.refreshReplayServerStatus();
  if (!auth.initialized) {
    void auth.initialize();
  }
  void loadPlaySessionInfo();
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as Node;
  if (!moreMenuRef.value?.contains(target)) {
    moreMenuOpen.value = false;
  }
  if (!newGameMenuRef.value?.contains(target)) {
    newGameMenuOpen.value = false;
  }
}

function closeMenus(): void {
  moreMenuOpen.value = false;
  newGameMenuOpen.value = false;
}

function handleExportSystemLog(): void {
  closeMenus();
  game.exportSystemLog();
}

function handleExportServerReplay(): void {
  closeMenus();
  void game.exportServerReplay().catch((error: unknown) => {
    window.alert(error instanceof Error ? error.message : '导出回放失败');
  });
}

function handleExportDiceLog(): void {
  closeMenus();
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

function handleSoloNewGame(): void {
  if (game.hasSession && !window.confirm('开始新游戏将清除当前进度，确定吗？')) {
    return;
  }
  game.resetGame();
  ui.setTab('board');
  ui.resetSetupGuideForNewGame();
}

async function handleRestartInPlaySession(): Promise<void> {
  closeMenus();
  const id = game.activePlaySessionId;
  if (!id) {
    return;
  }
  if (game.hasSession && !window.confirm('本房再开一局将清除当前进度，确定吗？')) {
    return;
  }
  const ok = await game.startNewGameInPlaySession(id);
  if (!ok) {
    window.alert(game.lastError ?? '无法在本竞赛房中重新开始');
    return;
  }
  ui.setTab('board');
  ui.resetSetupGuideForNewGame();
}

function handleLeaveRoomSoloNewGame(): void {
  closeMenus();
  if (
    !window.confirm(
      '将离开竞赛房并开始单人练习。当前进度不会计入竞赛房会话榜，确定吗？',
    )
  ) {
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

function toggleMoreMenu(): void {
  moreMenuOpen.value = !moreMenuOpen.value;
  newGameMenuOpen.value = false;
}

function toggleNewGameMenu(): void {
  newGameMenuOpen.value = !newGameMenuOpen.value;
  moreMenuOpen.value = false;
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
      </div>
    </header>

    <nav class="tabs-bar" aria-label="视图导航">
      <div class="tabs-left">
        <RouterLink
          v-if="inPlaySession && playSessionInfo"
          :to="`/sessions/${playSessionInfo.id}`"
          class="room-badge session"
        >
          <span class="room-badge-label">竞赛房</span>
          <span class="room-badge-title">{{ playSessionInfo.title }}</span>
          <span v-if="playSessionStatusLabel" class="room-badge-status">{{ playSessionStatusLabel }}</span>
        </RouterLink>
        <span v-else-if="inPlaySession" class="room-badge session muted">竞赛房中…</span>
        <span v-else-if="showSoloPracticeBadge" class="room-badge solo">单人练习</span>

        <div class="tabs">
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
        </div>
      </div>

      <div class="tabs-actions">
        <template v-if="game.hasSession">
          <button type="button" class="btn btn-sm" @click="handleOpenGuide">游戏说明</button>

          <template v-if="!inPlaySession">
            <button type="button" class="btn btn-sm" @click="handleSave">存档</button>
            <button v-if="game.hasSavedGame" type="button" class="btn btn-sm" @click="handleLoad">
              读档
            </button>
          </template>

          <div v-if="inPlaySession" ref="newGameMenuRef" class="menu-wrap">
            <button type="button" class="btn btn-sm" @click.stop="toggleNewGameMenu">
              本房再开一局 ▾
            </button>
            <div v-if="newGameMenuOpen" class="dropdown">
              <button type="button" class="menu-item" @click="handleRestartInPlaySession">
                本房再开一局
              </button>
              <button type="button" class="menu-item" @click="handleLeaveRoomSoloNewGame">
                退出房间，单人练习
              </button>
            </div>
          </div>
          <button v-else type="button" class="btn btn-sm" @click="handleSoloNewGame">新游戏</button>

          <div ref="moreMenuRef" class="menu-wrap">
            <button type="button" class="btn btn-sm" @click.stop="toggleMoreMenu">更多 ▾</button>
            <div v-if="moreMenuOpen" class="dropdown">
              <button type="button" class="menu-item" @click="handleExportSystemLog">
                导出系统日志{{ game.systemLogSize > 0 ? ` (${game.systemLogSize})` : '' }}
              </button>
              <button type="button" class="menu-item" @click="handleExportServerReplay">
                导出服务器回放
              </button>
              <button type="button" class="menu-item" @click="handleExportDiceLog">
                导出骰子日志{{ game.diceRollArchiveSize > 0 ? ` (${game.diceRollArchiveSize})` : '' }}
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <button type="button" class="btn btn-sm" @click="handleOpenGuide">游戏说明</button>
          <button
            v-if="!inPlaySession && game.hasSavedGame"
            type="button"
            class="btn btn-sm"
            @click="handleLoad"
          >
            读档
          </button>
          <div v-if="inPlaySession" ref="newGameMenuRef" class="menu-wrap">
            <button type="button" class="btn btn-sm primary" @click.stop="toggleNewGameMenu">
              开始游戏 ▾
            </button>
            <div v-if="newGameMenuOpen" class="dropdown">
              <button type="button" class="menu-item" @click="handleRestartInPlaySession">
                本房开始游戏
              </button>
              <button type="button" class="menu-item" @click="handleLeaveRoomSoloNewGame">
                退出房间，单人练习
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="btn btn-sm primary"
            @click="handleStartNewGame"
          >
            新游戏
          </button>
        </template>
      </div>
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
  flex-shrink: 0;
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

.dev-link:hover {
  color: #6366f1;
}

.tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.tabs-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.room-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.room-badge.session {
  background: #eef2ff;
  color: #3730a3;
  text-decoration: none;
  border: 1px solid #c7d2fe;
}

.room-badge.session:hover {
  background: #e0e7ff;
}

.room-badge.session.muted {
  border-color: #e2e8f0;
  background: #f8fafc;
  color: #64748b;
}

.room-badge.solo {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.room-badge-label {
  font-weight: 600;
}

.room-badge-title {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-badge-status {
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.6875rem;
  color: #4f46e5;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  min-width: 0;
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

.tabs-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.menu-wrap {
  position: relative;
}

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.375rem);
  min-width: 11rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
  z-index: 50;
  padding: 0.25rem;
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: #334155;
  border-radius: 0.375rem;
  cursor: pointer;
  white-space: nowrap;
}

.menu-item:hover {
  background: #f8fafc;
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

.btn.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn.primary:hover {
  background: #1d4ed8;
}

.content {
  flex: 1;
  padding: 1.5rem;
}

@media (max-width: 900px) {
  .tabs-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .tabs-left {
    flex-wrap: wrap;
  }

  .tabs-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>
