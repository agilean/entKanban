<script setup lang="ts">
import { State, WipLimitAdjustment } from '@kanban-game/engine';
import { computed, ref, watch } from 'vue';
import { useGameStore } from '../../stores/gameStore';

defineProps<{
  remaining: number;
}>();

const game = useGameStore();

const effectiveDay = ref(11);
const selected = ref(3);
const analysis = ref(2);
const development = ref(4);
const test = ref(3);

watch(
  () => game.board,
  (board) => {
    if (!board) {
      return;
    }
    selected.value = board.getSelected().getLimit();
    analysis.value = board.getStateColumn(State.ANALYSIS).getLimit();
    development.value = board.getStateColumn(State.DEVELOPMENT).getLimit();
    test.value = board.getStateColumn(State.TEST).getLimit();
  },
  { immediate: true },
);

const queued = computed(() => game.wipAdjustments);

function submit(): void {
  const adjustment = new WipLimitAdjustment(
    effectiveDay.value,
    0,
    selected.value,
    analysis.value,
    development.value,
    test.value,
  );
  game.adjustWipLimits(adjustment);
}
</script>

<template>
  <section class="decision-section">
    <h3>调整 WIP 限制</h3>
    <p class="hint">还可排队 {{ remaining }} 次（最多 3 次）</p>

    <div class="field">
      <label for="wip-day">生效日</label>
      <input id="wip-day" v-model.number="effectiveDay" type="number" min="10" max="21" />
    </div>
    <div class="field-grid">
      <div class="field">
        <label for="wip-selected">Selected</label>
        <input id="wip-selected" v-model.number="selected" type="number" min="0" max="9" />
      </div>
      <div class="field">
        <label for="wip-analysis">Analysis</label>
        <input id="wip-analysis" v-model.number="analysis" type="number" min="0" max="9" />
      </div>
      <div class="field">
        <label for="wip-development">Development</label>
        <input id="wip-development" v-model.number="development" type="number" min="0" max="9" />
      </div>
      <div class="field">
        <label for="wip-test">Test</label>
        <input id="wip-test" v-model.number="test" type="number" min="0" max="9" />
      </div>
    </div>

    <button type="button" class="btn primary" :disabled="remaining === 0" @click="submit">
      排队调整
    </button>

    <ul v-if="queued.length > 0" class="queued">
      <li v-for="adj in queued" :key="adj.getDay()">
        Day {{ adj.getDay() }}: S{{ adj.getSelected() }} / A{{ adj.getAnalysis() }} / D{{
          adj.getDevelopment()
        }}
        / T{{ adj.getTest() }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.decision-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.hint {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  color: #64748b;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.field label {
  font-size: 0.75rem;
  color: #475569;
}

.field input {
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  cursor: pointer;
  width: 100%;
  margin-top: 0.25rem;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.queued {
  margin: 0.75rem 0 0;
  padding-left: 1rem;
  font-size: 0.75rem;
  color: #475569;
}
</style>
