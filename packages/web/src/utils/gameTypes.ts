import { GAME_TYPE_REGISTRY, GAME_TYPES, type GameTypeDefinition } from '@kanban-game/engine';

export function listAvailableGameTypes(): GameTypeDefinition[] {
  return GAME_TYPES.map((id) => GAME_TYPE_REGISTRY[id]);
}

export function getGameTypeLabel(id: string): string {
  const def = GAME_TYPE_REGISTRY[id as keyof typeof GAME_TYPE_REGISTRY];
  return def?.name ?? id;
}
