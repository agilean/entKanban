<script setup lang="ts">
import type { BlockerRollResult } from '@kanban-game/engine';

defineProps<{
  rolls: BlockerRollResult[];
}>();
</script>

<template>
  <aside class="blocker-banner" aria-label="Blocker 掷骰结果">
    <strong class="title">Blocker 掷骰</strong>
    <ul class="rolls">
      <li v-for="roll in rolls" :key="roll.cardName">
        {{ roll.cardName }}：掷出 {{ roll.roll }}，消减 {{ roll.delta }} 点
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.blocker-banner {
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fdf2f8;
  border: 1px solid #fbcfe8;
  border-radius: 0.75rem;
}

.title {
  font-size: 0.8125rem;
  color: #9d174d;
}

.rolls {
  margin: 0.375rem 0 0;
  padding-left: 1rem;
  font-size: 0.8125rem;
  color: #831843;
}
</style>
