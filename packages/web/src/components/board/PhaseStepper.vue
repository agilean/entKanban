<script setup lang="ts">
import { GamePhase } from '@kanban-game/engine';
import { computed } from 'vue';
import {
  isPhaseActive,
  isPhaseComplete,
  stepsForPhase,
} from '../../utils/phaseSteps';

const props = defineProps<{
  phase: GamePhase;
  currentDay: number;
}>();

const steps = computed(() => stepsForPhase(props.phase, props.currentDay));
</script>

<template>
  <nav class="phase-stepper" aria-label="日阶段进度">
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
  </nav>
</template>

<style scoped>
.phase-stepper {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}

.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
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
</style>
