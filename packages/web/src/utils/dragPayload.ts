import { activeDiceDragIndex } from './diceDragState';

export const DICE_INDEX_MIME = 'text/dice-index';
export const CARD_NAME_MIME = 'text/card-name';
export const FROM_COLUMN_MIME = 'text/from-column';

function transferTypes(event: DragEvent): string[] {
  const types = event.dataTransfer?.types;
  if (!types) {
    return [];
  }
  return Array.from(types);
}

export function isDiceDrag(event: DragEvent): boolean {
  const types = transferTypes(event);
  if (types.includes(DICE_INDEX_MIME)) {
    return true;
  }
  if (types.includes(FROM_COLUMN_MIME)) {
    return false;
  }
  if (types.includes(CARD_NAME_MIME) && !types.includes(DICE_INDEX_MIME)) {
    return false;
  }
  return activeDiceDragIndex.value !== null;
}

export function isCardAdvanceDrag(event: DragEvent): boolean {
  return transferTypes(event).includes(FROM_COLUMN_MIME);
}

export function isExpediteCardDrag(event: DragEvent): boolean {
  const types = transferTypes(event);
  return (
    types.includes(CARD_NAME_MIME) &&
    !types.includes(FROM_COLUMN_MIME) &&
    !types.includes(DICE_INDEX_MIME) &&
    activeDiceDragIndex.value === null
  );
}

export function readDiceIndex(event: DragEvent): number | null {
  const raw = event.dataTransfer?.getData(DICE_INDEX_MIME);
  if (raw) {
    const index = Number.parseInt(raw, 10);
    if (!Number.isNaN(index)) {
      return index;
    }
  }
  if (activeDiceDragIndex.value !== null) {
    return activeDiceDragIndex.value;
  }
  return null;
}
