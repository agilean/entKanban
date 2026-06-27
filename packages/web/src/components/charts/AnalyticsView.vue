<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore, type AppTab } from '../../stores/uiStore';
import CfdChart from './CfdChart.vue';
import ControlChart from './ControlChart.vue';
import FinancialTable from './FinancialTable.vue';
import LeadTimeChart from './LeadTimeChart.vue';

const ui = useUiStore();

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
  <component :is="activeComponent" v-if="activeComponent" />
</template>
