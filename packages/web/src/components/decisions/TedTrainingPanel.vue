<script setup lang="ts">
import { useGameStore } from '../../stores/gameStore';

const game = useGameStore();

function choose(training: boolean): void {
  game.sendTedToTraining(training);
}
</script>

<template>
  <section class="decision-section highlight">
    <h3>Day 17 · Ted 培训机会</h3>
    <p class="hint">
      送 Ted 参加培训将暂时减少 1 个 Test 骰子，Day 18 可雇佣 Tammy（+2 Test 骰子）。
    </p>
    <div class="actions">
      <button type="button" class="btn primary" @click="choose(true)">送 Ted 培训</button>
      <button type="button" class="btn" @click="choose(false)">不培训</button>
    </div>
  </section>
</template>

<style scoped>
.decision-section {
  border-radius: 0.5rem;
}

.decision-section.highlight {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 0.75rem;
}

.decision-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e40af;
}

.hint {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  color: #475569;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  flex: 1;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
</style>
