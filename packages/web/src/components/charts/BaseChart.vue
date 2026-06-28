<script setup lang="ts">
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { useIsMobile } from '../../composables/useIsMobile';

const props = defineProps<{
  option: Record<string, unknown>;
  height?: string;
}>();

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const { isMobile } = useIsMobile();

const style = computed(() => ({
  height: props.height ?? (isMobile.value ? '260px' : '320px'),
  width: '100%',
}));
</script>

<template>
  <VChart class="chart" :option="option" autoresize :style="style" />
</template>

<style scoped>
.chart {
  min-height: 240px;
}
</style>
