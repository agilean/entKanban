<script setup lang="ts">
import { useAnalytics } from '../../composables/useAnalytics';
import BaseChart from './BaseChart.vue';
import ChartEmpty from './ChartEmpty.vue';

const { leadTimeOption, deployedMetrics, leadTimeP85 } = useAnalytics();
</script>

<template>
  <section class="chart-panel">
    <h2>前置时间分布</h2>
    <p class="desc">
      Lead Time 直方图
      <span v-if="deployedMetrics.length > 0">· P85 = {{ leadTimeP85 }} 天</span>
    </p>
    <ChartEmpty v-if="deployedMetrics.length === 0" message="完成部署后显示分布图" />
    <BaseChart v-else :option="leadTimeOption" />
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
