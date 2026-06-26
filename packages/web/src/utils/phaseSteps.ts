import { GamePhase } from '@kanban-game/engine';

export type PhaseStep = {
  id: GamePhase;
  label: string;
};

export const DAY_STEPS: PhaseStep[] = [{ id: GamePhase.REPLENISH, label: '准备' }];

export const DAY_17_STEPS: PhaseStep[] = [
  { id: GamePhase.REPLENISH, label: '准备' },
  { id: GamePhase.TED_TRAINING, label: 'Ted' },
];

const PREPARATION_PHASES = new Set<GamePhase>([
  GamePhase.ADJUST_WIP,
  GamePhase.REMOVE_BLOCKERS,
  GamePhase.REPLENISH,
  GamePhase.EXPEDITE,
  GamePhase.ASSIGN_DICE,
  GamePhase.SETUP,
]);

const PHASE_ORDER: GamePhase[] = [
  GamePhase.REPLENISH,
  GamePhase.DO_WORK,
  GamePhase.TED_TRAINING,
  GamePhase.GAME_OVER,
];

export function phaseIndex(phase: GamePhase): number {
  if (PREPARATION_PHASES.has(phase)) {
    return PHASE_ORDER.indexOf(GamePhase.REPLENISH);
  }
  const index = PHASE_ORDER.indexOf(phase);
  return index >= 0 ? index : 0;
}

export function isPhaseComplete(current: GamePhase, step: GamePhase): boolean {
  return phaseIndex(current) > phaseIndex(step);
}

export function isPhaseActive(current: GamePhase, step: GamePhase): boolean {
  if (step === GamePhase.REPLENISH) {
    return PREPARATION_PHASES.has(current);
  }
  return current === step;
}

export function stepsForPhase(current: GamePhase, currentDay: number): PhaseStep[] {
  if (current === GamePhase.GAME_OVER) {
    return [{ id: GamePhase.GAME_OVER, label: '结束' }];
  }
  if (currentDay === 17) {
    return DAY_17_STEPS;
  }
  return DAY_STEPS;
}
