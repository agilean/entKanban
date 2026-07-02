import { GAME_TYPE_REGISTRY, GAME_TYPES, type GameTypeDefinition } from '@kanban-game/engine';
import { HUB_GAMES, type HubGameId } from './gameHub';

export type PlayModeId = HubGameId;

export type PlayMode = {
  id: PlayModeId;
  label: string;
  description: string;
  route: string;
};

export const PLAY_MODES: PlayMode[] = HUB_GAMES.filter((game) => game.available).map((game) => ({
  id: game.id,
  label: game.title,
  description: game.description,
  route: game.route,
}));

export function listAvailableGameTypes(): GameTypeDefinition[] {
  return GAME_TYPES.map((id) => GAME_TYPE_REGISTRY[id]);
}

export function getGameTypeLabel(id: string): string {
  const def = GAME_TYPE_REGISTRY[id as keyof typeof GAME_TYPE_REGISTRY];
  return def?.name ?? id;
}
