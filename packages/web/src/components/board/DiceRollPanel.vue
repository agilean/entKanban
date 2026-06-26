<script setup lang="ts">
import { State } from '@kanban-game/engine';
import { computed } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import { endDiceDrag } from '../../utils/diceDragState';

const game = useGameStore();
const ui = useUiStore();

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

const uiState = computed(() => game.diceRollUi);
const phase = computed(() => uiState.value?.phase ?? 'results');
const steps = computed(() => uiState.value?.steps ?? []);
const applyingIndex = computed(() => uiState.value?.activeIndex ?? 0);
const busy = computed(() => phase.value === 'applying');

function effortLabel(step: (typeof steps.value)[number]): string {
  const stateName = STATE_LABEL[step.state];
  return `${stateName} ${step.effortBefore} → ${step.effortAfter}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function handleApply(): Promise<void> {
  if (busy.value || steps.value.length === 0) {
    return;
  }
  game.setDiceRollApplying(0);
  const pendingSteps = game.pendingRollPreview;
  const start = game.appliedRollCount;
  for (let index = start; index < pendingSteps.length; index += 1) {
    game.setDiceRollApplying(index);
    await delay(550);
    const result = game.applyRollStep(index, ui.activeTab);
    if (!result?.ok) {
      game.closeDiceRollUi();
      endDiceDrag();
      return;
    }
    await delay(300);
  }
  game.closeDiceRollUi();
  endDiceDrag();
}
</script>

<template>
  <aside
    v-if="uiState?.visible"
    class="dice-roll-panel"
    role="region"
    aria-live="polite"
    aria-label="掷骰结果"
  >
    <header class="panel-header">
      <p class="title">Day {{ game.currentDay }} 掷骰结果</p>
      <p class="subtitle">
        <template v-if="phase === 'results'">确认后点击「应用」，看板上将逐卡核销</template>
        <template v-else>正在看板上逐卡核销…</template>
      </p>
    </header>

    <ol class="result-list">
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
            :class="[
              STATE_CLASS[step.state],
              { spin: phase === 'applying' && index === applyingIndex },
            ]"
          >
            <template v-if="phase === 'applying' && index === applyingIndex">?</template>
            <template v-else>{{ step.dieLabels[dieIndex] }}{{ value }}</template>
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
      @click="handleApply"
    >
      应用
    </button>
  </aside>
</template>

<style scoped>
.dice-roll-panel {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 20;
  width: min(20rem, calc(100% - 1rem));
  max-height: calc(100% - 1rem);
  overflow-y: auto;
  padding: 1rem;
  border-radius: 0.875rem;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 28px rgb(15 23 42 / 14%);
  backdrop-filter: blur(6px);
}

.panel-header {
  margin-bottom: 0.75rem;
}

.title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.4;
}

.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-item {
  padding: 0.625rem 0.75rem;
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
  margin-bottom: 0.25rem;
}

.state-tag {
  font-size: 0.625rem;
  font-weight: 700;
  color: #fff;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.state-tag.analysis,
.mini-die.analysis {
  background: #2563eb;
}

.state-tag.development,
.mini-die.development {
  background: #16a34a;
}

.state-tag.test,
.mini-die.test {
  background: #d97706;
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

.mini-die.spin {
  animation: roll 0.45s ease-in-out infinite alternate;
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
  margin-top: 0.75rem;
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
    transform: rotate(-12deg) translateY(0);
  }
  100% {
    transform: rotate(12deg) translateY(-4px);
  }
}
</style>
