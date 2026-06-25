<script setup lang="ts">
import { useAnalytics } from '../../composables/useAnalytics';
import BaseChart from './BaseChart.vue';
import ChartEmpty from './ChartEmpty.vue';

const { cfdOption, hasData } = useAnalytics();
</script>

<template>
  <section class="chart-panel">
    <h2>累积流图 (CFD)</h2>
    <p class="desc">各列 WIP 随时间堆叠变化</p>
    <ChartEmpty v-if="!hasData" />
    <BaseChart v-else :option="cfdOption" />
  </section>
</template>

<style scoped>
.chart-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
}

.chart-panel h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.desc {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.8125rem;
  color: #64748b;
}
</style>
