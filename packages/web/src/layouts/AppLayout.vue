<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { PLAY_MODES } from '../utils/gameTypes';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useUiStore, type AppTab } from '../stores/uiStore';
import UserMenu from '../components/layout/UserMenu.vue';
import MobileGameBottomBar from '../components/mobile/MobileGameBottomBar.vue';
import { useIsMobile } from '../composables/useIsMobile';
import {
  fetchPlaySessionWithStatus,
  type PlaySession,
  type PlaySessionStatus,
} from '../utils/playSessionApi';

const game = useGameStore();
const ui = useUiStore();
const auth = useAuthStore();
const router = useRouter();
const { isMobile } = useIsMobile();

const playModes = PLAY_MODES;

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
const playModeMenuOpen = ref(false);
const moreMenuRef = ref<HTMLElement | null>(null);
const newGameMenuRef = ref<HTMLElement | null>(null);
const playModeMenuRef = ref<HTMLElement | null>(null);

const inPlaySession = computed(() => Boolean(game.activePlaySessionId));

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
async function loadPlaySessionInfo(): Promise<void> {
  const id = game.activePlaySessionId;
  if (!id) {
    playSessionInfo.value = null;
    return;
  }
  const result = await fetchPlaySessionWithStatus(id);
  if (result.data) {
    playSessionInfo.value = result.data.playSession;
    return;
  }
  playSessionInfo.value = null;
  if (result.status === 404 || result.status === 401 || result.status === 403) {
    game.clearActivePlaySession();
  }
}

watch(
  () => game.activePlaySessionId,
  () => {
    void loadPlaySessionInfo();
  },
);

watch(
  () => auth.initialized,
  (ready) => {
    if (ready) {
      void loadPlaySessionInfo();
    }
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
  if (!playModeMenuRef.value?.contains(target)) {
    playModeMenuOpen.value = false;
  }
}

function closeMenus(): void {
  moreMenuOpen.value = false;
  newGameMenuOpen.value = false;
  playModeMenuOpen.value = false;
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

function confirmClearProgress(): boolean {
  if (game.hasSession && !window.confirm('开始新游戏将清除当前进度，确定吗？')) {
    return false;
  }
  return true;
}

function startKanbanGame(): void {
  closeMenus();
  if (game.hasSession) {
    if (!confirmClearProgress()) {
      return;
    }
    game.resetGame();
  } else {
    game.startNewGame();
  }
  ui.setTab('board');
  ui.resetSetupGuideForNewGame();
}

function startEvacuationGame(): void {
  closeMenus();
  if (!confirmClearProgress()) {
    return;
  }
  if (game.hasSession) {
    game.resetGame();
  }
  void router.push('/game/run-fast');
}

function handleStartNewGame(): void {
  startKanbanGame();
}

function handleSoloNewGame(): void {
  startKanbanGame();
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
  playModeMenuOpen.value = false;
}

function toggleNewGameMenu(): void {
  newGameMenuOpen.value = !newGameMenuOpen.value;
  moreMenuOpen.value = false;
  playModeMenuOpen.value = false;
}

function togglePlayModeMenu(): void {
  playModeMenuOpen.value = !playModeMenuOpen.value;
  moreMenuOpen.value = false;
  newGameMenuOpen.value = false;
}

function handlePlayModeSelect(modeId: string): void {
  if (modeId === 'evacuation') {
    startEvacuationGame();
    return;
  }
  startKanbanGame();
}
</script>

<template>
  <div class="layout" :class="{ 'layout--mobile': isMobile }">
    <header class="header">
      <div class="brand">
        <h1>EntKanban</h1>
        <p class="context-line">
          <RouterLink v-if="auth.org" to="/org" class="context-link">{{ auth.org.name }}</RouterLink>
          <RouterLink v-else-if="auth.isLoggedIn" to="/org" class="context-link muted">
            创建组织
          </RouterLink>
          <span v-else class="context-muted">访客</span>
          <span class="context-sep">·</span>
          <RouterLink
            v-if="inPlaySession && playSessionInfo"
            :to="`/sessions/${playSessionInfo.id}`"
            class="context-link"
          >
            竞赛房：{{ playSessionInfo.title }}
            <span v-if="playSessionStatusLabel" class="context-status">{{ playSessionStatusLabel }}</span>
          </RouterLink>
          <span v-else-if="inPlaySession" class="context-muted">竞赛房中…</span>
          <span v-else class="context-muted">单人练习</span>
        </p>
      </div>
      <div class="header-actions">
        <UserMenu />
      </div>
    </header>

    <nav class="tabs-bar" aria-label="视图导航">
      <div class="tabs-left">
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

      <div v-if="!isMobile" class="tabs-actions">
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
          <div v-else ref="playModeMenuRef" class="menu-wrap">
            <button type="button" class="btn btn-sm" @click.stop="togglePlayModeMenu">新游戏 ▾</button>
            <div v-if="playModeMenuOpen" class="dropdown">
              <button
                v-for="mode in playModes"
                :key="mode.id"
                type="button"
                class="menu-item play-mode-item"
                @click="handlePlayModeSelect(mode.id)"
              >
                <span class="play-mode-label">{{ mode.label }}</span>
                <span class="play-mode-desc">{{ mode.description }}</span>
              </button>
            </div>
          </div>

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
          <div v-else ref="playModeMenuRef" class="menu-wrap">
            <button type="button" class="btn btn-sm primary" @click.stop="togglePlayModeMenu">
              新游戏 ▾
            </button>
            <div v-if="playModeMenuOpen" class="dropdown">
              <button
                v-for="mode in playModes"
                :key="mode.id"
                type="button"
                class="menu-item play-mode-item"
                @click="handlePlayModeSelect(mode.id)"
              >
                <span class="play-mode-label">{{ mode.label }}</span>
                <span class="play-mode-desc">{{ mode.description }}</span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </nav>

    <main class="content">
      <slot />
    </main>

    <MobileGameBottomBar
      :in-play-session="inPlaySession"
      :on-open-guide="handleOpenGuide"
      :on-save="handleSave"
      :on-load="handleLoad"
      :on-solo-new-game="handleSoloNewGame"
      :on-start-new-game="handleStartNewGame"
      :on-start-evacuation="startEvacuationGame"
      :on-restart-in-play-session="handleRestartInPlaySession"
      :on-leave-room-solo-new-game="handleLeaveRoomSoloNewGame"
      :on-export-system-log="handleExportSystemLog"
      :on-export-server-replay="handleExportServerReplay"
      :on-export-dice-log="handleExportDiceLog"
    />
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

.context-line {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #64748b;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.context-link {
  color: #475569;
  text-decoration: none;
}

.context-link:hover {
  color: #2563eb;
}

.context-link.muted {
  color: #94a3b8;
}

.context-muted {
  color: #94a3b8;
}

.context-sep {
  color: #cbd5e1;
}

.context-status {
  margin-left: 0.25rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.6875rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
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
  min-width: 13rem;
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

.play-mode-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  white-space: normal;
}

.play-mode-label {
  font-weight: 600;
  color: #1e293b;
}

.play-mode-desc {
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

.layout--mobile .content {
  padding: 0.75rem 0.75rem calc(4.5rem + env(safe-area-inset-bottom));
}

.layout--mobile .header {
  padding: 0.75rem 1rem;
}

.layout--mobile .brand h1 {
  font-size: 1.125rem;
}

.layout--mobile .context-line {
  font-size: 0.8125rem;
}

.layout--mobile .tabs-bar {
  padding: 0.375rem 0.75rem;
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
