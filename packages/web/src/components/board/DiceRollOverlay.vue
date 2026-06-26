<script setup lang="ts">
import type { DiceRollApplyStep } from '@kanban-game/engine';
import { State } from '@kanban-game/engine';
import { computed } from 'vue';

const props = defineProps<{
  phase: 'rolling' | 'results' | 'applying';
  steps: DiceRollApplyStep[];
  rollingIndex: number;
  applyingIndex: number;
  currentDay: number;
}>();

const emit = defineEmits<{
  apply: [];
}>();

const STATE_LABEL: Record<State, string> = {
  [State.ANALYSIS]: '分析',
  [State.DEVELOPMENT]: '开发',
  [State.TEST]: '测试',
};

const STATE_CLASS: Record<State, string> = {
  [State.ANALYSIS]: 'analysis',
  [State.DEVELOPMENT]: 'development',
  [State.TEST]: 'test',
};

const title = computed(() => {
  if (props.phase === 'rolling') {
    const step = props.steps[props.rollingIndex];
    return step ? `掷骰子 · ${step.cardName}` : '掷骰子中…';
  }
  if (props.phase === 'applying') {
    const step = props.steps[props.applyingIndex];
    return step ? `核销点数 · ${step.cardName}` : '核销中…';
  }
  return `Day ${props.currentDay} 掷骰结果`;
});

const subtitle = computed(() => {
  if (props.phase === 'rolling') {
    return '正在掷骰，请稍候…';
  }
  if (props.phase === 'applying') {
    return '逐张卡片核销剩余工作量';
  }
  return '确认结果后点击「应用」写入看板';
});

const activeStep = computed(() => {
  if (props.phase === 'rolling') {
    return props.steps[props.rollingIndex];
  }
  if (props.phase === 'applying') {
    return props.steps[props.applyingIndex];
  }
  return null;
});

function effortLabel(step: DiceRollApplyStep): string {
  const key = step.state;
  const stateName = STATE_LABEL[key];
  return `${stateName} ${step.effortBefore} → ${step.effortAfter}`;
}
</script>

<template>
  <div class="overlay" role="dialog" aria-modal="true" aria-live="polite">
    <div class="panel">
      <p class="title">{{ title }}</p>
      <p class="subtitle">{{ subtitle }}</p>

      <div v-if="activeStep && phase !== 'results'" class="active-roll">
        <div class="dice-row" :class="{ rolling: phase === 'rolling' }">
          <span
            v-for="(value, index) in activeStep.rollValues"
            :key="index"
            class="die"
            :class="[STATE_CLASS[activeStep.state], { spin: phase === 'rolling' }]"
            :style="{ animationDelay: `${index * 0.08}s` }"
          >
            <template v-if="phase === 'rolling'">?</template>
            <template v-else>{{ value }}</template>
          </span>
        </div>
        <p v-if="phase === 'applying'" class="apply-delta">
          −{{ activeStep.delta }} 点（合计 {{ activeStep.totalRoll }}）
        </p>
      </div>

      <ol v-if="phase === 'results' || phase === 'applying'" class="result-list">
        <li
          v-for="(step, index) in steps"
          :key="`${step.cardName}-${index}`"
          class="result-item"
          :class="{
            current: phase === 'applying' && index === applyingIndex,
            done: phase === 'applying' && index < applyingIndex,
          }"
        >
          <div class="result-head">
            <strong>{{ step.cardName }}</strong>
            <span class="state-tag" :class="STATE_CLASS[step.state]">
              {{ STATE_LABEL[step.state] }}
            </span>
          </div>
          <div class="result-dice">
            <span
              v-for="(value, dieIndex) in step.rollValues"
              :key="dieIndex"
              class="mini-die"
              :class="STATE_CLASS[step.state]"
            >
              {{ step.dieLabels[dieIndex] }}{{ value }}
            </span>
            <span class="total">合计 {{ step.totalRoll }}</span>
          </div>
          <div class="result-effort">
            剩余 {{ effortLabel(step) }}
            <span v-if="step.delta > 0" class="delta">−{{ step.delta }}</span>
          </div>
        </li>
      </ol>

      <button
        v-if="phase === 'results'"
        type="button"
        class="btn-apply"
        @click="emit('apply')"
      >
        应用
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 45%);
  backdrop-filter: blur(2px);
}

.panel {
  width: min(28rem, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 20px 40px rgb(15 23 42 / 20%);
}

.title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
}

.subtitle {
  margin: 0.5rem 0 1rem;
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
}

.active-roll {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.dice-row {
  display: flex;
  justify-content: center;
  gap: 0.625rem;
}

.die {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 8px rgb(15 23 42 / 18%);
}

.die.analysis,
.mini-die.analysis,
.state-tag.analysis {
  background: #2563eb;
}

.die.development,
.mini-die.development,
.state-tag.development {
  background: #16a34a;
}

.die.test,
.mini-die.test,
.state-tag.test {
  background: #d97706;
}

.die.spin {
  animation: roll 0.45s ease-in-out infinite alternate;
}

.apply-delta {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #16a34a;
}

.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.result-item {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.625rem;
  background: #f8fafc;
  transition: border-color 0.2s, background 0.2s;
}

.result-item.current {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 2px #dbeafe;
}

.result-item.done {
  opacity: 0.65;
}

.result-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.state-tag {
  font-size: 0.625rem;
  font-weight: 700;
  color: #fff;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.result-dice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.mini-die {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.5rem;
  padding: 0 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
}

.total {
  font-size: 0.75rem;
  color: #64748b;
}

.result-effort {
  font-size: 0.8125rem;
  color: #334155;
}

.delta {
  margin-left: 0.375rem;
  font-weight: 700;
  color: #16a34a;
}

.btn-apply {
  display: block;
  width: 100%;
  margin-top: 1rem;
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-apply:hover {
  background: #1d4ed8;
}

@keyframes roll {
  0% {
    transform: rotate(-18deg) translateY(0);
  }
  100% {
    transform: rotate(18deg) translateY(-6px);
  }
}
</style>
