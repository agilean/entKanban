export const DICE_INDEX_MIME = 'text/dice-index';
export const CARD_NAME_MIME = 'text/card-name';
export const FROM_COLUMN_MIME = 'text/from-column';

export function isDiceDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(DICE_INDEX_MIME) ?? false;
}

export function isCardAdvanceDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(FROM_COLUMN_MIME) ?? false;
}

export function isExpediteCardDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types ?? [];
  return types.includes(CARD_NAME_MIME) && !types.includes(FROM_COLUMN_MIME) && !types.includes(DICE_INDEX_MIME);
}

export function readDiceIndex(event: DragEvent): number | null {
  const raw = event.dataTransfer?.getData(DICE_INDEX_MIME);
  if (!raw) {
    return null;
  }
  const index = Number.parseInt(raw, 10);
  return Number.isNaN(index) ? null : index;
}
