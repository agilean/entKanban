<script setup lang="ts">
import { GamePhase } from '@kanban-game/engine';
import { computed } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import { confirmLabel } from '../../utils/confirmLabel';
import { endDiceDrag } from '../../utils/diceDragState';
import {
  isPhaseActive,
  isPhaseComplete,
  stepsForPhase,
} from '../../utils/phaseSteps';

defineProps<{
  phase: GamePhase;
  currentDay: number;
}>();

const game = useGameStore();
const ui = useUiStore();

const i1DailyDeployActive = computed(
  () => game.boardView?.columns.find((c) => c.id === 'ready')?.i1DailyDeployActive,
);

const steps = computed(() =>
  stepsForPhase(game.phase, game.currentDay, i1DailyDeployActive.value),
);

const confirmAction = computed(() =>
  game.pendingActions.find((action) => action.kind === 'confirm'),
);

const busy = computed(() => game.isDiceRollActive);

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
    await game.runDiceRollAnimation(ui.activeTab);
    return;
  }
  game.confirmPhase(ui.activeTab);
}
</script>

<template>
  <nav class="day-phase-bar" aria-label="日阶段进度">
    <div class="day-label">
      <span class="day-number">Day {{ game.currentDay }}</span>
      <span v-if="game.phase === GamePhase.DO_WORK" class="day-sub">工作中</span>
      <span v-else-if="game.phase === GamePhase.RELEASE" class="day-sub release">
        {{ i1DailyDeployActive ? '每日发布' : '发布日' }}
      </span>
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
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.day-number {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.day-sub {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #2563eb;
}

.day-sub.release {
  color: #15803d;
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
  min-height: 2.75rem;
  min-width: 5.5rem;
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
