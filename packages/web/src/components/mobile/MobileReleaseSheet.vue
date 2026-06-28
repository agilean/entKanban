<script setup lang="ts">
import DecisionPanel from '../decisions/DecisionPanel.vue';
import { useUiStore } from '../../stores/uiStore';
import MobileActionSheet from './MobileActionSheet.vue';

const ui = useUiStore();
</script>

<template>
  <MobileActionSheet
    :open="ui.mobileReleaseSheetOpen"
    title="发布与收益"
    @close="ui.closeMobileReleaseSheet()"
  >
    <DecisionPanel class="embedded" />
  </MobileActionSheet>
</template>

<style scoped>
:deep(.embedded.decision-panel) {
  border: none;
  padding: 0.5rem;
  max-height: none;
}
</style>
