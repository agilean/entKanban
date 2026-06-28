import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

export function useIsMobile(): { isMobile: Ref<boolean> } {
  const isMobile = ref(
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA_QUERY).matches : false,
  );

  let mql: MediaQueryList | null = null;

  function update(): void {
    isMobile.value = mql?.matches ?? window.innerWidth <= 768;
  }

  onMounted(() => {
    mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    update();
    mql.addEventListener('change', update);
  });

  onUnmounted(() => {
    mql?.removeEventListener('change', update);
  });

  return { isMobile };
}
