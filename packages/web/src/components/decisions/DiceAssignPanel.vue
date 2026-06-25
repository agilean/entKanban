<script setup lang="ts">
import { State, type DiceAssignmentInput } from '@kanban-game/engine';
import { computed, ref } from 'vue';
import { useGameStore } from '../../stores/gameStore';

defineProps<{
  diceCount: number;
}>();

const game = useGameStore();
const manualMode = ref(false);
const selectedState = ref<State>(State.ANALYSIS);
const selectedCard = ref('');
const selectedDice = ref<number[]>([]);
const assignments = ref<DiceAssignmentInput[]>([]);

const states = [State.ANALYSIS, State.DEVELOPMENT, State.TEST];

const stateLabels: Record<State, string> = {
  [State.ANALYSIS]: 'Analysis',
  [State.DEVELOPMENT]: 'Development',
  [State.TEST]: 'Test',
};

const diceList = computed(() => {
  if (!game.board) {
    return [];
  }
  return game.board.getDice().map((die, index) => ({
    index,
    label: die.toString(),
    state: die.getActivity(),
  }));
});

const incompleteCards = computed(() => {
  if (!game.board) {
    return [];
  }
  return game.board
    .getStateColumn(selectedState.value)
    .getIncompleteCards()
    .map((card) => card.getName());
});

function toggleDie(index: number): void {
  if (selectedDice.value.includes(index)) {
    selectedDice.value = selectedDice.value.filter((i) => i !== index);
  } else {
    selectedDice.value = [...selectedDice.value, index];
  }
}

function addAssignment(): void {
  if (!selectedCard.value || selectedDice.value.length === 0) {
    return;
  }
  assignments.value = [
    ...assignments.value.filter(
      (a) => !(a.state === selectedState.value && a.cardName === selectedCard.value),
    ),
    {
      state: selectedState.value,
      cardName: selectedCard.value,
      diceIndices: [...selectedDice.value],
    },
  ];
  selectedDice.value = [];
}

function applyManual(): void {
  if (assignments.value.length > 0) {
    game.assignDice(assignments.value);
  }
}

function clearAssignments(): void {
  assignments.value = [];
}
</script>

<template>
  <section class="decision-section">
    <h3>分配骰子</h3>
    <p class="hint">
      共 {{ diceCount }} 颗骰子。留空并点「确认骰子分配」将使用引擎默认策略；或开启手动分配。
    </p>

    <label class="toggle">
      <input v-model="manualMode" type="checkbox" />
      手动分配
    </label>

    <template v-if="manualMode">
      <div class="field">
        <label>列</label>
        <select v-model="selectedState">
          <option v-for="state in states" :key="state" :value="state">
            {{ stateLabels[state] }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>卡片</label>
        <select v-model="selectedCard">
          <option value="">选择卡片</option>
          <option v-for="name in incompleteCards" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </div>

      <div class="dice-pool">
        <button
          v-for="die in diceList"
          :key="die.index"
          type="button"
          class="die-btn"
          :class="{ active: selectedDice.includes(die.index) }"
          @click="toggleDie(die.index)"
        >
          {{ die.label }}{{ die.index }}
        </button>
      </div>

      <button type="button" class="btn" @click="addAssignment">添加分配</button>

      <ul v-if="assignments.length > 0" class="assignment-list">
        <li v-for="(item, idx) in assignments" :key="idx">
          {{ stateLabels[item.state] }} · {{ item.cardName }} → 骰子 {{ item.diceIndices.join(', ') }}
        </li>
      </ul>

      <div class="row">
        <button type="button" class="btn primary" @click="applyManual">应用手动分配</button>
        <button type="button" class="btn" @click="clearAssignments">清空</button>
      </div>
    </template>
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

.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
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

.field select {
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

.dice-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.die-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 999px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.die-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn {
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

.row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.assignment-list {
  margin: 0.5rem 0;
  padding-left: 1rem;
  font-size: 0.75rem;
  color: #475569;
}
</style>
