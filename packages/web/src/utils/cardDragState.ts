import { ref } from 'vue';

export type ActiveCardDrag = {
  cardName: string;
  fromColumn: string;
};

export const activeCardDrag = ref<ActiveCardDrag | null>(null);

export function beginCardDrag(cardName: string, fromColumn: string): void {
  activeCardDrag.value = { cardName, fromColumn };
}

export function endCardDrag(): void {
  activeCardDrag.value = null;
}

export function readActiveCardDrag(): ActiveCardDrag | null {
  return activeCardDrag.value;
}
