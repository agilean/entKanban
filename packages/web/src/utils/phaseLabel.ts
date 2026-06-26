import { GamePhase } from '@kanban-game/engine';

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.SETUP]: '准备',
  [GamePhase.ADJUST_WIP]: 'Stand Up · 调整 WIP',
  [GamePhase.REMOVE_BLOCKERS]: 'Stand Up · 消除 Blocker',
  [GamePhase.REPLENISH]: '准备 · 填充 / 加速 / 分配骰子',
  [GamePhase.EXPEDITE]: '准备 · 填充 / 加速 / 分配骰子',
  [GamePhase.ASSIGN_DICE]: '准备 · 填充 / 加速 / 分配骰子',
  [GamePhase.DO_WORK]: '工作',
  [GamePhase.RELEASE]: '发布',
  [GamePhase.END_OF_DAY]: '日终',
  [GamePhase.TED_TRAINING]: 'Ted 培训决策',
  [GamePhase.DAY_COMPLETE]: '今日结束',
  [GamePhase.GAME_OVER]: '游戏结束',
};

export function phaseLabel(phase: GamePhase): string {
  return PHASE_LABELS[phase] ?? phase;
}
