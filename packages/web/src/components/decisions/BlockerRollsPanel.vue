<script setup lang="ts">
import type { BlockerRollResult } from '@kanban-game/engine';

defineProps<{
  rolls: BlockerRollResult[];
}>();
</script>

<template>
  <section class="decision-section">
    <h3>Blocker 掷骰</h3>
    <ul class="rolls">
      <li v-for="roll in rolls" :key="roll.cardName">
        {{ roll.cardName }}：掷出 {{ roll.roll }}，消减 {{ roll.delta }} 点
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

.rolls {
  margin: 0;
  padding-left: 1rem;
  font-size: 0.8125rem;
  color: #475569;
}
</style>
