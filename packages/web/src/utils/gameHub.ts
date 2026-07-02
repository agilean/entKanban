export type HubGameId = 'kanban' | 'evacuation';

export type HubGame = {
  id: HubGameId;
  title: string;
  description: string;
  route: string;
  icon: string;
  accent: string;
  available: boolean;
  comingSoonLabel?: string;
};

/** 精益游戏屋可选游戏列表，后续新游戏在此追加 */
export const HUB_GAMES: HubGame[] = [
  {
    id: 'kanban',
    title: '精益看板',
    description: '21 天 EntKanban 挑战，在体验中理解流动、拉动与限制 WIP。',
    route: '/game/kanban',
    icon: '📋',
    accent: '#2563eb',
    available: true,
  },
  {
    id: 'evacuation',
    title: '跑得快',
    description: '社会力模型 · 单出口疏散，用时越短排名越高。',
    route: '/game/run-fast',
    icon: '🏃',
    accent: '#d97706',
    available: true,
  },
];

export function getHubGame(id: HubGameId): HubGame | undefined {
  return HUB_GAMES.find((game) => game.id === id);
}
