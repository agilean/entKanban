<script setup lang="ts">
defineProps<{
  agentCount: number;
  panicMode: boolean;
  isRunning: boolean;
  isComplete: boolean;
}>();

const emit = defineEmits<{
  'update:agentCount': [value: number];
  'update:panicMode': [value: boolean];
  start: [];
  pause: [];
  reset: [];
}>();

const countOptions = [20, 50, 100];

function onCountChange(count: number): void {
  emit('update:agentCount', count);
}

function onModeChange(panic: boolean): void {
  emit('update:panicMode', panic);
}
</script>

<template>
  <div class="controls">
    <h3>控制面板</h3>

    <div class="field">
      <label>人数</label>
      <div class="btn-group">
        <button
          v-for="n in countOptions"
          :key="n"
          type="button"
          class="btn"
          :class="{ active: agentCount === n }"
          :disabled="isRunning"
          @click="onCountChange(n)"
        >
          {{ n }}
        </button>
      </div>
    </div>

    <div class="field">
      <label>疏散模式</label>
      <div class="btn-group">
        <button
          type="button"
          class="btn"
          :class="{ active: !panicMode }"
          :disabled="isRunning"
          @click="onModeChange(false)"
        >
          正常
        </button>
        <button
          type="button"
          class="btn panic"
          :class="{ active: panicMode }"
          :disabled="isRunning"
          @click="onModeChange(true)"
        >
          恐慌/竞争
        </button>
      </div>
    </div>

    <div class="actions">
      <button v-if="!isRunning" type="button" class="btn primary" @click="emit('start')">
        {{ isComplete ? '重新运行' : '开始' }}
      </button>
      <button v-else type="button" class="btn" @click="emit('pause')">暂停</button>
      <button type="button" class="btn" :disabled="isRunning" @click="emit('reset')">重置</button>
    </div>

    <div class="legend">
      <div class="legend-item"><span class="dot normal" /> 正常模式行人</div>
      <div class="legend-item"><span class="dot panic" /> 恐慌模式行人</div>
      <div class="legend-item"><span class="dot exit" /> 出口</div>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.controls h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.field label {
  display: block;
  font-size: 0.8125rem;
  color: #64748b;
  margin-bottom: 0.375rem;
}

.btn-group {
  display: flex;
  gap: 0.375rem;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn:hover:not(:disabled) {
  background: #f8fafc;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.active {
  background: #e0e7ff;
  border-color: #818cf8;
  color: #3730a3;
  font-weight: 600;
}

.btn.panic.active {
  background: #fee2e2;
  border-color: #f87171;
  color: #991b1b;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  flex: 1;
}

.btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.normal {
  background: #3b82f6;
}

.dot.panic {
  background: #ef4444;
}

.dot.exit {
  background: #22c55e;
  border-radius: 2px;
}
</style>
