<script setup lang="ts">
import { State } from '@kanban-game/engine';
import type { DiceView } from '../../utils/buildBoardView';

defineProps<{
  dice: DiceView;
}>();

const stateClass: Record<State, string> = {
  [State.ANALYSIS]: 'analysis',
  [State.DEVELOPMENT]: 'development',
  [State.TEST]: 'test',
};
</script>

<template>
  <span class="dice-chip" :class="stateClass[dice.state]" :title="dice.state">
    {{ dice.label }}
  </span>
</template>

<style scoped>
.dice-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 15%);
}

.dice-chip.analysis {
  background: #2563eb;
}

.dice-chip.development {
  background: #16a34a;
}

.dice-chip.test {
  background: #d97706;
}
</style>
