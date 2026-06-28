export const GAME_TYPES = ['kanban'] as const;
export type GameTypeId = (typeof GAME_TYPES)[number];

export type GameTypeDefinition = {
  id: GameTypeId;
  name: string;
  description: string;
  route: string;
  maxDay: number;
};

export const GAME_TYPE_REGISTRY: Record<GameTypeId, GameTypeDefinition> = {
  kanban: {
    id: 'kanban',
    name: 'getKanban',
    description: '21 天 Kanban 挑战',
    route: '/',
    maxDay: 21,
  },
};

export function isValidGameType(value: string): value is GameTypeId {
  return (GAME_TYPES as readonly string[]).includes(value);
}

export function getGameType(id: string): GameTypeDefinition | null {
  if (!isValidGameType(id)) {
    return null;
  }
  return GAME_TYPE_REGISTRY[id];
}
