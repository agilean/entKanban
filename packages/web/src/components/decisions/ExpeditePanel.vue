<script setup lang="ts">
import { State } from '@kanban-game/engine';
import { useGameStore } from '../../stores/gameStore';

const props = defineProps<{
  state: State;
  eligibleCards: string[];
}>();

const game = useGameStore();

const stateLabels: Record<State, string> = {
  [State.ANALYSIS]: 'Analysis',
  [State.DEVELOPMENT]: 'Development',
  [State.TEST]: 'Test',
};

function expedite(cardName: string): void {
  game.expediteCard(props.state, cardName);
}
</script>

<template>
  <section class="decision-section">
    <h3>{{ stateLabels[state] }} · Expedite</h3>
    <p v-if="eligibleCards.length === 0" class="hint">无可 Expedite 卡片</p>
    <div v-else class="actions">
      <button
        v-for="cardName in eligibleCards"
        :key="cardName"
        type="button"
        class="btn expedite"
        @click="expedite(cardName)"
      >
        Expedite {{ cardName }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.decision-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.hint {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.btn {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;
}

.btn:hover {
  background: #fee2e2;
}
</style>
