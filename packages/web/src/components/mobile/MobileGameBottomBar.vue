<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useIsMobile } from '../../composables/useIsMobile';
import { useGameStore } from '../../stores/gameStore';
import MobileActionSheet from './MobileActionSheet.vue';

const props = defineProps<{
  inPlaySession: boolean;
  onOpenGuide: () => void;
  onSave: () => void;
  onLoad: () => void;
  onSoloNewGame: () => void;
  onStartNewGame: () => void;
  onRestartInPlaySession: () => void | Promise<void>;
  onLeaveRoomSoloNewGame: () => void;
  onExportSystemLog: () => void;
  onExportServerReplay: () => void;
  onExportDiceLog: () => void;
}>();

const game = useGameStore();
const router = useRouter();
const { isMobile } = useIsMobile();

const moreOpen = ref(false);
const newGameOpen = ref(false);

async function handleRestart(): Promise<void> {
  newGameOpen.value = false;
  await props.onRestartInPlaySession();
}
</script>

<template>
  <nav v-if="isMobile" class="mobile-bottom-bar" aria-label="游戏操作">
    <button type="button" class="bar-btn" @click="props.onOpenGuide()">说明</button>

    <template v-if="game.hasSession">
      <button v-if="!inPlaySession" type="button" class="bar-btn" @click="props.onSave()">存档</button>
      <button
        v-if="!inPlaySession && game.hasSavedGame"
        type="button"
        class="bar-btn"
        @click="props.onLoad()"
      >
        读档
      </button>
      <button
        v-if="inPlaySession"
        type="button"
        class="bar-btn primary"
        @click="newGameOpen = true"
      >
        本房再开
      </button>
      <button v-else type="button" class="bar-btn" @click="props.onSoloNewGame()">新游戏</button>
    </template>

    <template v-else>
      <button
        v-if="!inPlaySession && game.hasSavedGame"
        type="button"
        class="bar-btn"
        @click="props.onLoad()"
      >
        读档
      </button>
      <button
        v-if="inPlaySession"
        type="button"
        class="bar-btn primary"
        @click="newGameOpen = true"
      >
        开始游戏
      </button>
      <button v-else type="button" class="bar-btn primary" @click="props.onStartNewGame()">新游戏</button>
    </template>

    <button type="button" class="bar-btn" @click="moreOpen = true">更多</button>

    <MobileActionSheet :open="newGameOpen" title="游戏" @close="newGameOpen = false">
      <div class="sheet-actions">
        <button v-if="inPlaySession" type="button" class="sheet-btn primary" @click="handleRestart">
          {{ game.hasSession ? '本房再开一局' : '本房开始游戏' }}
        </button>
        <button
          v-if="inPlaySession"
          type="button"
          class="sheet-btn"
          @click="props.onLeaveRoomSoloNewGame(); newGameOpen = false"
        >
          退出房间，单人练习
        </button>
      </div>
    </MobileActionSheet>

    <MobileActionSheet :open="moreOpen" title="更多" @close="moreOpen = false">
      <div class="sheet-actions">
        <button
          v-if="game.hasSession"
          type="button"
          class="sheet-btn"
          @click="props.onExportSystemLog(); moreOpen = false"
        >
          导出系统日志
        </button>
        <button
          v-if="game.hasSession"
          type="button"
          class="sheet-btn"
          @click="props.onExportServerReplay(); moreOpen = false"
        >
          导出服务器回放
        </button>
        <button
          v-if="game.hasSession"
          type="button"
          class="sheet-btn"
          @click="props.onExportDiceLog(); moreOpen = false"
        >
          导出骰子日志
        </button>
        <button type="button" class="sheet-btn" @click="router.push('/sessions'); moreOpen = false">
          竞赛房
        </button>
      </div>
    </MobileActionSheet>
  </nav>
</template>

<style scoped>
.mobile-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 16px rgb(15 23 42 / 8%);
}

.bar-btn {
  flex: 1;
  min-height: 2.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

.bar-btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.sheet-actions {
  display: grid;
  gap: 0.5rem;
  padding: 0.5rem;
}

.sheet-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0.625rem;
  padding: 0.875rem;
  font-size: 0.9375rem;
  cursor: pointer;
}

.sheet-btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
</style>
