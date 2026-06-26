import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AppTab = 'board' | 'cfd' | 'control' | 'leadtime' | 'run' | 'finance';

export const useUiStore = defineStore('ui', () => {
  const activeTab = ref<AppTab>('board');
  const dragToast = ref<string | null>(null);
  let dragToastTimer: ReturnType<typeof setTimeout> | null = null;

  function setTab(tab: AppTab): void {
    activeTab.value = tab;
  }

  function showDragToast(message: string): void {
    dragToast.value = message;
    if (dragToastTimer) {
      clearTimeout(dragToastTimer);
    }
    dragToastTimer = setTimeout(() => {
      dragToast.value = null;
      dragToastTimer = null;
    }, 3200);
  }

  return { activeTab, dragToast, setTab, showDragToast };
});
