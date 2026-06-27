import type { DiceRollApplyStep } from '../dice/DiceRollApplyStep.js';
import type { DiceAssignmentInput } from '../session/PlayerAction.js';

/** One completed work-day dice roll (assignments + rolled points + effort delta). */
export type DiceRollLogEntry = {
  day: number;
  assignments: DiceAssignmentInput[];
  steps: DiceRollApplyStep[];
  recordedAt: string;
};

export function cloneDiceRollLogEntry(entry: DiceRollLogEntry): DiceRollLogEntry {
  return {
    day: entry.day,
    recordedAt: entry.recordedAt,
    assignments: entry.assignments.map((assignment) => ({
      ...assignment,
      diceIndices: [...assignment.diceIndices],
    })),
    steps: entry.steps.map((step) => ({
      ...step,
      diceIndices: [...step.diceIndices],
      dieLabels: [...step.dieLabels],
      rollValues: [...step.rollValues],
    })),
  };
}
