<script setup lang="ts">
import { ENGINE_VERSION } from '@kanban-game/engine';

const title = 'getKanban Game';
</script>

<template>
  <main class="app">
    <h1>{{ title }}</h1>
    <p>Engine {{ ENGINE_VERSION }}</p>
  </main>
</template>

<style scoped>
.app {
  font-family: system-ui, sans-serif;
  margin: 2rem;
}
</style>
