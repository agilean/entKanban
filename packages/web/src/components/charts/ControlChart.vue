<script setup lang="ts">
import { useAnalytics } from '../../composables/useAnalytics';
import BaseChart from './BaseChart.vue';
import ChartEmpty from './ChartEmpty.vue';

const { controlOption, deployedMetrics } = useAnalytics();
</script>

<template>
  <section class="chart-panel">
    <h2>控制图</h2>
    <p class="desc">已部署卡片的 Cycle Time 与均值</p>
    <ChartEmpty v-if="deployedMetrics.length === 0" message="完成部署后显示控制图" />
    <BaseChart v-else :option="controlOption" />
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
