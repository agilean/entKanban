import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AppTab = 'board' | 'cfd' | 'control' | 'leadtime' | 'finance';

export const useUiStore = defineStore('ui', () => {
  const activeTab = ref<AppTab>('board');
  const dragToast = ref<string | null>(null);
  const setupGuideOpen = ref(false);
  const setupGuideDismissed = ref(false);
  const gameOverDismissed = ref(false);
  const orgOnboardingDismissed = ref(false);
  let dragToastTimer: ReturnType<typeof setTimeout> | null = null;

  function setTab(tab: AppTab): void {
    activeTab.value = tab;
  }

  function openSetupGuide(): void {
    setupGuideOpen.value = true;
  }

  function closeSetupGuide(): void {
    setupGuideOpen.value = false;
    setupGuideDismissed.value = true;
  }

  function dismissGameOver(): void {
    gameOverDismissed.value = true;
  }

  function resetGameOverDismissed(): void {
    gameOverDismissed.value = false;
  }

  function resetSetupGuideForNewGame(): void {
    setupGuideDismissed.value = false;
    setupGuideOpen.value = true;
    gameOverDismissed.value = false;
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

  function dismissOrgOnboarding(): void {
    orgOnboardingDismissed.value = true;
  }

  function resetOrgOnboardingDismissed(): void {
    orgOnboardingDismissed.value = false;
  }

  return {
    activeTab,
    dragToast,
    setupGuideOpen,
    setupGuideDismissed,
    gameOverDismissed,
    orgOnboardingDismissed,
    setTab,
    openSetupGuide,
    closeSetupGuide,
    dismissGameOver,
    resetGameOverDismissed,
    resetSetupGuideForNewGame,
    dismissOrgOnboarding,
    resetOrgOnboardingDismissed,
    showDragToast,
  };
});
