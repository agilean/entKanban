import { GamePhase } from '@kanban-game/engine';

export type PhaseStep = {
  id: GamePhase;
  label: string;
};

export const SETUP_STEPS: PhaseStep[] = [
  { id: GamePhase.SETUP, label: '准备' },
];

export const DAY_STEPS: PhaseStep[] = [
  { id: GamePhase.REPLENISH, label: '准备' },
  { id: GamePhase.DO_WORK, label: '工作' },
  { id: GamePhase.TED_TRAINING, label: 'Ted' },
  { id: GamePhase.DAY_COMPLETE, label: '日终' },
];

const PREPARATION_PHASES = new Set<GamePhase>([
  GamePhase.ADJUST_WIP,
  GamePhase.REMOVE_BLOCKERS,
  GamePhase.REPLENISH,
  GamePhase.EXPEDITE,
  GamePhase.ASSIGN_DICE,
]);

const PHASE_ORDER: GamePhase[] = [
  GamePhase.SETUP,
  GamePhase.ADJUST_WIP,
  GamePhase.REMOVE_BLOCKERS,
  GamePhase.REPLENISH,
  GamePhase.EXPEDITE,
  GamePhase.ASSIGN_DICE,
  GamePhase.DO_WORK,
  GamePhase.END_OF_DAY,
  GamePhase.TED_TRAINING,
  GamePhase.DAY_COMPLETE,
  GamePhase.GAME_OVER,
];

export function phaseIndex(phase: GamePhase): number {
  if (phase === GamePhase.SETUP) {
    return PHASE_ORDER.indexOf(GamePhase.SETUP);
  }
  if (PREPARATION_PHASES.has(phase)) {
    return PHASE_ORDER.indexOf(GamePhase.REPLENISH);
  }
  return PHASE_ORDER.indexOf(phase);
}

export function isPhaseComplete(current: GamePhase, step: GamePhase): boolean {
  return phaseIndex(current) > phaseIndex(step);
}

export function isPhaseActive(current: GamePhase, step: GamePhase): boolean {
  if (step === GamePhase.SETUP) {
    return current === GamePhase.SETUP;
  }
  if (step === GamePhase.REPLENISH) {
    return PREPARATION_PHASES.has(current) && current !== GamePhase.SETUP;
  }
  return current === step;
}

export function stepsForPhase(current: GamePhase, currentDay: number): PhaseStep[] {
  if (current === GamePhase.GAME_OVER) {
    return [{ id: GamePhase.GAME_OVER, label: '结束' }];
  }
  if (currentDay === 9 && current === GamePhase.SETUP) {
    return SETUP_STEPS;
  }
  if (currentDay === 17) {
    return DAY_STEPS;
  }
  return DAY_STEPS.filter((step) => step.id !== GamePhase.TED_TRAINING);
}
