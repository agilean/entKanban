import type { GameSessionState } from '@kanban-game/engine';
import type { AppTab } from '../stores/uiStore';

export const SAVE_KEY = 'kanban-game-save';

export type SavedGamePayload = {
  session: GameSessionState;
  activeTab: AppTab;
  savedAt: string;
};

export function saveGame(payload: SavedGamePayload): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function loadGame(): SavedGamePayload | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SavedGamePayload;
    if (!parsed.session?.board) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasSavedGame(): boolean {
  return loadGame() !== null;
}

export function clearSavedGame(): void {
  localStorage.removeItem(SAVE_KEY);
}
