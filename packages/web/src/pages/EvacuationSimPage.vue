<script setup lang="ts">
import { RouterLink } from 'vue-router';
import EvacuationCanvas from '../components/evacuation/EvacuationCanvas.vue';
import EvacuationControls from '../components/evacuation/EvacuationControls.vue';
import EvacuationStats from '../components/evacuation/EvacuationStats.vue';
import { useEvacuationSim } from '../composables/useEvacuationSim';

const sim = useEvacuationSim();
const {
  engine,
  stats,
  panicMode,
  agentCount,
  frameTick,
  start,
  pause,
  reset,
  setAgentCount,
  setPanicMode,
  registerDrawCallback,
  unregisterDrawCallback,
} = sim;

function handleStart(): void {
  if (stats.isComplete) {
    reset();
  }
  start();
}
</script>

<template>
  <div class="page">
    <header class="header">
      <RouterLink to="/" class="back-link">← 返回游戏</RouterLink>
      <div class="title-block">
        <h1>社会力疏散模拟</h1>
        <p class="subtitle">Helbing Social Force Model · 单出口房间 · Faster-is-Slower</p>
      </div>
    </header>

    <div class="layout">
      <section class="canvas-section">
        <EvacuationCanvas
          :engine="engine"
          :frame-tick="frameTick"
          :register-draw="registerDrawCallback"
          :unregister-draw="unregisterDrawCallback"
        />
      </section>

      <aside class="sidebar">
        <EvacuationControls
          :agent-count="agentCount"
          :panic-mode="panicMode"
          :is-running="stats.isRunning"
          :is-complete="stats.isComplete"
          @update:agent-count="setAgentCount"
          @update:panic-mode="setPanicMode"
          @start="handleStart"
          @pause="pause"
          @reset="reset"
        />
        <EvacuationStats :stats="stats" :panic-mode="panicMode" />
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
}
</style>
