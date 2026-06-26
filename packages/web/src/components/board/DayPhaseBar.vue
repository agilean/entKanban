<script setup lang="ts">
import { GamePhase } from '@kanban-game/engine';
import type { DiceRollApplyStep } from '@kanban-game/engine';
import { computed, ref } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import { confirmLabel } from '../../utils/confirmLabel';
import { endDiceDrag } from '../../utils/diceDragState';
import {
  isPhaseActive,
  isPhaseComplete,
  stepsForPhase,
} from '../../utils/phaseSteps';
import DiceRollOverlay from './DiceRollOverlay.vue';

defineProps<{
  phase: GamePhase;
  currentDay: number;
}>();

const game = useGameStore();
const ui = useUiStore();

const steps = computed(() => stepsForPhase(game.phase, game.currentDay));

const confirmAction = computed(() =>
  game.pendingActions.find((action) => action.kind === 'confirm'),
);

const overlayOpen = ref(false);
const overlayPhase = ref<'rolling' | 'results' | 'applying'>('rolling');
const rollSteps = ref<DiceRollApplyStep[]>([]);
const rollingIndex = ref(0);
const applyingIndex = ref(0);
const busy = computed(() => overlayOpen.value);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function animateRolling(preview: DiceRollApplyStep[]): Promise<void> {
  overlayPhase.value = 'rolling';
  rollingIndex.value = 0;
  for (let index = 0; index < preview.length; index += 1) {
    rollingIndex.value = index;
    await delay(700);
  }
  overlayPhase.value = 'results';
}

async function handleConfirm(): Promise<void> {
  if (busy.value) {
    return;
  }
  const action = confirmAction.value;
  if (action?.label === 'do-work') {
    endDiceDrag();
    const result = game.rollDice(ui.activeTab);
    if (!result?.ok) {
      return;
    }
    const preview = game.pendingRollPreview;
    if (preview.length === 0) {
      return;
    }
    rollSteps.value = [...preview];
    overlayOpen.value = true;
    await animateRolling(rollSteps.value);
    return;
  }
  game.confirmPhase(ui.activeTab);
}

async function handleApply(): Promise<void> {
  if (overlayPhase.value !== 'results') {
    return;
  }
  overlayPhase.value = 'applying';
  const start = game.appliedRollCount;
  for (let index = start; index < rollSteps.value.length; index += 1) {
    applyingIndex.value = index;
    await delay(450);
    const result = game.applyRollStep(index, ui.activeTab);
    if (!result?.ok) {
      overlayOpen.value = false;
      endDiceDrag();
      return;
    }
    await delay(350);
  }
  overlayOpen.value = false;
  rollSteps.value = [];
  endDiceDrag();
}
</script>

<template>
  <DiceRollOverlay
    v-if="overlayOpen"
    :phase="overlayPhase"
    :steps="rollSteps"
    :rolling-index="rollingIndex"
    :applying-index="applyingIndex"
    :current-day="currentDay"
    @apply="handleApply"
  />

  <nav class="day-phase-bar" aria-label="日阶段进度">
    <div class="day-label">
      <span class="day-number">Day {{ currentDay }}</span>
    </div>

    <ol class="steps">
      <li
        v-for="step in steps"
        :key="step.id"
        class="step"
        :class="{
          active: isPhaseActive(phase, step.id),
          complete: isPhaseComplete(phase, step.id),
        }"
      >
        <span class="dot" />
        <span class="label">{{ step.label }}</span>
      </li>
    </ol>

    <div class="actions">
      <button
        v-if="confirmAction && !game.isGameOver"
        type="button"
        class="btn-next"
        :disabled="busy"
        @click="handleConfirm"
      >
        {{ confirmLabel(confirmAction.label) }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.day-phase-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}

.day-label {
  flex-shrink: 0;
}

.day-number {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  justify-content: center;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #94a3b8;
}

.step .dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  background: #e2e8f0;
}

.step.complete {
  color: #64748b;
}

.step.complete .dot {
  background: #86efac;
}

.step.active {
  color: #1d4ed8;
  font-weight: 600;
}

.step.active .dot {
  background: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
}

.actions {
  flex-shrink: 0;
}

.btn-next {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-next:hover {
  background: #1d4ed8;
}

.btn-next:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 768px) {
  .day-phase-bar {
    flex-wrap: wrap;
  }

  .steps {
    order: 3;
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
