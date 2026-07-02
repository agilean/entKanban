export type HubGameId = 'lean-challenge' | 'kanban' | 'evacuation';

export type HubGame = {
  id: HubGameId;
  title: string;
  description: string;
  route: string;
  icon: string;
  accent: string;
  available: boolean;
  comingSoonLabel?: string;
  external?: boolean;
};

/** 精益游戏屋可选游戏列表，后续新游戏在此追加 */
export const HUB_GAMES: HubGame[] = [
  {
    id: 'lean-challenge',
    title: '精益闯关小游戏',
    description: '精益知识问答闯关，先记热身题再答精益题，练习价值、流动、拉动等基础概念。',
    route: '/lean-challenge/index.html',
    icon: '🧠',
    accent: '#2a6f67',
    available: true,
    external: true,
  },
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
