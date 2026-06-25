<script setup lang="ts">
import type { ColumnView } from '../../utils/buildBoardView';
import CardTile from './CardTile.vue';
import DiceChip from './DiceChip.vue';

defineProps<{
  column: ColumnView;
}>();
</script>

<template>
  <section class="kanban-column">
    <header class="column-header">
      <h3>{{ column.title }}</h3>
      <span class="wip">{{ column.count }}/{{ column.limitLabel }}</span>
    </header>

    <div class="cards">
      <CardTile v-for="card in column.cards" :key="card.id" :card="card" />
    </div>

    <footer v-if="column.dice.length > 0" class="dice-row">
      <DiceChip v-for="die in column.dice" :key="die.id" :dice="die" />
    </footer>
  </section>
</template>

<style scoped>
.kanban-column {
  flex: 0 0 9.5rem;
  min-width: 9.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.625rem;
  max-height: 28rem;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.25rem;
}

.column-header h3 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.wip {
  font-size: 0.6875rem;
  color: #64748b;
  font-weight: 600;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow-y: auto;
  flex: 1;
  min-height: 2rem;
}

.dice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed #e2e8f0;
}
</style>
