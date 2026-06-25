import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AppTab = 'board' | 'cfd' | 'control' | 'leadtime' | 'run' | 'finance';

export const useUiStore = defineStore('ui', () => {
  const activeTab = ref<AppTab>('board');

  function setTab(tab: AppTab): void {
    activeTab.value = tab;
  }

  return { activeTab, setTab };
});
