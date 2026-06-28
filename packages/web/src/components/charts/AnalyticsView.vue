<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore, type AppTab } from '../../stores/uiStore';
import { useIsMobile } from '../../composables/useIsMobile';
import CfdChart from './CfdChart.vue';
import ControlChart from './ControlChart.vue';
import FinancialTable from './FinancialTable.vue';
import LeadTimeChart from './LeadTimeChart.vue';

const ui = useUiStore();
const { isMobile } = useIsMobile();

const componentByTab: Record<Exclude<AppTab, 'board'>, object> = {
  cfd: CfdChart,
  control: ControlChart,
  leadtime: LeadTimeChart,
  finance: FinancialTable,
};

const activeComponent = computed(() => {
  if (ui.activeTab === 'board') {
    return null;
  }
  return componentByTab[ui.activeTab];
});
</script>

<template>
  <div class="analytics-view" :class="{ 'analytics-view--mobile': isMobile }">
    <component :is="activeComponent" v-if="activeComponent" />
  </div>
</template>

<style scoped>
.analytics-view--mobile :deep(.chart-panel) {
  padding: 0.75rem;
}

.analytics-view--mobile :deep(.chart-panel h2) {
  font-size: 0.9375rem;
}

.analytics-view--mobile :deep(.desc) {
  font-size: 0.75rem;
}

.analytics-view--mobile :deep(.chart) {
  min-height: 200px;
}
</style>
