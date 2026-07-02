<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import EvacuationCanvas from '../components/evacuation/EvacuationCanvas.vue';
import EvacuationControls from '../components/evacuation/EvacuationControls.vue';
import EvacuationPillarPalette from '../components/evacuation/EvacuationPillarPalette.vue';
import EvacuationStats from '../components/evacuation/EvacuationStats.vue';
import { useEvacuationSim } from '../composables/useEvacuationSim';
import { useAuthStore } from '../stores/authStore';
import type { ObstacleKind } from '../simulation/evacuation/types';
import { submitEvacuationResult } from '../utils/leaderboardApi';

const auth = useAuthStore();
const sim = useEvacuationSim();
const {
  engine,
  stats,
  panicRatio,
  runSessionId,
  fixedAgentCount,
  frameTick,
  start,
  pause,
  reset,
  setPanicRatio,
  dropObstacle,
  clearObstacles,
  registerDrawCallback,
  unregisterDrawCallback,
} = sim;

const submitStatus = ref<'idle' | 'submitting' | 'success' | 'error' | 'login-required'>('idle');
const dropRejected = ref(false);
const draggingKind = ref<ObstacleKind | null>(null);
let dropRejectTimer: ReturnType<typeof setTimeout> | null = null;

function submissionKey(sessionId: string): string {
  return `evacuation-result-submitted:${sessionId}`;
}

async function submitResultIfNeeded(): Promise<void> {
  if (!stats.isComplete) {
    return;
  }
  if (!auth.isLoggedIn) {
    submitStatus.value = 'login-required';
    return;
  }
  const key = submissionKey(runSessionId.value);
  if (sessionStorage.getItem(key) === '1') {
    submitStatus.value = 'success';
    return;
  }

  submitStatus.value = 'submitting';
  const ok = await submitEvacuationResult({
    sessionId: runSessionId.value,
    elapsedTime: stats.elapsedTime,
    panicRatio: panicRatio.value,
    agentCount: fixedAgentCount,
  });
  if (ok) {
    sessionStorage.setItem(key, '1');
    submitStatus.value = 'success';
    return;
  }
  submitStatus.value = 'error';
}

function handleDrop(kind: ObstacleKind, x: number, y: number): void {
  draggingKind.value = null;
  const placed = dropObstacle(kind, x, y);
  if (!placed) {
    showDropRejected();
  }
}

function showDropRejected(): void {
  dropRejected.value = true;
  if (dropRejectTimer) {
    clearTimeout(dropRejectTimer);
  }
  dropRejectTimer = setTimeout(() => {
    dropRejected.value = false;
    dropRejectTimer = null;
  }, 2500);
}

function handleStart(): void {
  if (stats.isComplete) {
    reset();
    submitStatus.value = 'idle';
  }
  start();
}

function handleReset(): void {
  reset();
  submitStatus.value = 'idle';
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
});

watch(
  () => stats.isComplete,
  (complete) => {
    if (complete) {
      void submitResultIfNeeded();
    }
  },
);

watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn && stats.isComplete && submitStatus.value === 'login-required') {
      void submitResultIfNeeded();
    }
  },
);
</script>

<template>
  <div class="page">
    <header class="header">
      <RouterLink to="/game" class="back-link">← 返回游戏屋</RouterLink>
      <div class="title-block">
        <h1>跑得快</h1>
        <p class="subtitle">Helbing Social Force Model · 单出口房间 · 用时排行榜</p>
      </div>
    </header>

    <div class="layout">
      <section class="canvas-section">
        <div class="sim-stage">
          <EvacuationPillarPalette
            :disabled="stats.isRunning"
            @drag-start="draggingKind = $event"
            @drag-end="draggingKind = null"
          />
          <EvacuationCanvas
            :engine="engine"
            :frame-tick="frameTick"
            :dragging-kind="draggingKind"
            :is-running="stats.isRunning"
            :register-draw="registerDrawCallback"
            :unregister-draw="unregisterDrawCallback"
            @drop-obstacle="handleDrop"
            @drop-rejected="showDropRejected"
          />
        </div>
      </section>

      <aside class="sidebar">
        <EvacuationControls
          :agent-count="fixedAgentCount"
          :panic-ratio="panicRatio"
          :obstacle-count="engine.room.obstacles.length"
          :drop-rejected="dropRejected"
          :is-running="stats.isRunning"
          :is-complete="stats.isComplete"
          @update:panic-ratio="setPanicRatio"
          @clear-obstacles="clearObstacles"
          @start="handleStart"
          @pause="pause"
          @reset="handleReset"
        />
        <EvacuationStats
          :stats="stats"
          :panic-ratio="panicRatio"
          :submit-status="submitStatus"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f6f8;
  color: #1a1a2e;
}

.header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.back-link {
  font-size: 0.875rem;
  color: #64748b;
  text-decoration: none;
  white-space: nowrap;
}

.back-link:hover {
  color: #2563eb;
}

.title-block h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 22rem;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.canvas-section {
  min-width: 0;
}

.sim-stage {
  display: flex;
  align-items: stretch;
  max-height: 700px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: #fff;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  align-self: start;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sim-stage {
    flex-direction: column;
    max-height: none;
  }
}
</style>
