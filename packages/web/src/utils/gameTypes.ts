import { GAME_TYPE_REGISTRY, GAME_TYPES, type GameTypeDefinition } from '@kanban-game/engine';

export type PlayModeId = 'kanban' | 'evacuation';

export type PlayMode = {
  id: PlayModeId;
  label: string;
  description: string;
  route: string;
};

export const PLAY_MODES: PlayMode[] = [
  {
    id: 'kanban',
    label: '看板游戏',
    description: '21 天 EntKanban 挑战',
    route: '/',
  },
  {
    id: 'evacuation',
    label: '疏散模拟',
    description: '社会力模型 · 单出口疏散',
    route: '/evacuation',
  },
];

export function listAvailableGameTypes(): GameTypeDefinition[] {
  return GAME_TYPES.map((id) => GAME_TYPE_REGISTRY[id]);
}

export function getGameTypeLabel(id: string): string {
  const def = GAME_TYPE_REGISTRY[id as keyof typeof GAME_TYPE_REGISTRY];
  return def?.name ?? id;
}
