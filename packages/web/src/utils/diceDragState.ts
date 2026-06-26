import { ref } from 'vue';

export const activeDiceDragIndex = ref<number | null>(null);

export function beginDiceDrag(index: number): void {
  activeDiceDragIndex.value = index;
}

export function endDiceDrag(): void {
  activeDiceDragIndex.value = null;
}

export function isActiveDiceDrag(): boolean {
  return activeDiceDragIndex.value !== null;
}
