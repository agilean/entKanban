<script setup lang="ts">
defineProps<{
  panicRatio: number;
  agentCount: number;
  obstacleCount: number;
  isRunning: boolean;
  isComplete: boolean;
  dropRejected: boolean;
}>();

const emit = defineEmits<{
  'update:panicRatio': [value: number];
  start: [];
  pause: [];
  reset: [];
  clearObstacles: [];
}>();

function onRatioInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  emit('update:panicRatio', value);
}
</script>

<template>
  <div class="controls">
    <h3>控制面板</h3>

    <div class="field">
      <label>人数</label>
      <p class="fixed-value">{{ agentCount }} 人</p>
    </div>

    <div class="field">
      <label>恐慌比例</label>
      <div class="ratio-row">
        <span class="ratio-label">正常</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          :value="panicRatio"
          :disabled="isRunning"
          class="ratio-slider"
          @input="onRatioInput"
        />
        <span class="ratio-label panic">恐慌</span>
      </div>
      <p class="ratio-value">恐慌 {{ panicRatio }}% · 正常 {{ 100 - panicRatio }}%</p>
    </div>

    <div class="field">
      <label>房间柱体（{{ obstacleCount }} 个）</label>
      <p class="field-hint">从左侧拖入柱体，松手后人员会自动重新分布</p>
      <p v-if="dropRejected" class="field-error">此处无法放置（太靠边、挡住出口或与其他柱体重叠）</p>
      <button
        type="button"
        class="btn clear-btn"
        :disabled="isRunning || obstacleCount === 0"
        @click="emit('clearObstacles')"
      >
        清除全部柱体
      </button>
    </div>

    <div class="actions">
      <button v-if="!isRunning" type="button" class="btn primary" @click="emit('start')">
        {{ isComplete ? '重新运行' : '开始' }}
      </button>
      <button v-else type="button" class="btn" @click="emit('pause')">暂停</button>
      <button type="button" class="btn" :disabled="isRunning" @click="emit('reset')">重置</button>
    </div>

    <div class="legend">
      <div class="legend-item"><span class="dot normal" /> 正常行人</div>
      <div class="legend-item"><span class="dot panic" /> 恐慌行人</div>
      <div class="legend-item"><span class="pillar" /> 柱体障碍</div>
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

.fixed-value {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.field-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.4;
}

.field-error {
  margin: 0.375rem 0 0;
  font-size: 0.75rem;
  color: #b91c1c;
  line-height: 1.4;
}

.ratio-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ratio-label {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

.ratio-label.panic {
  color: #dc2626;
}

.ratio-slider {
  flex: 1;
  accent-color: #ef4444;
}

.ratio-value {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: #475569;
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

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  flex: 1;
}

.btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.clear-btn {
  margin-top: 0.5rem;
  width: 100%;
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

.pillar {
  width: 10px;
  height: 10px;
  background: #cbd5e1;
  border: 1px solid #64748b;
  border-radius: 2px;
}
</style>
