import type { Board } from '../Board.js';
import { State } from '../State.js';
import type { Card } from '../card/Card.js';
import { DiceGroup } from '../dice/DiceGroup.js';
import type { StateDice } from '../dice/StateDice.js';
import type { DiceAssignmentStrategy } from './DiceAssignmentStrategy.js';

const COLUMN_PASS_ORDER: State[] = [
  State.TEST,
  State.DEVELOPMENT,
  State.ANALYSIS,
  State.TEST,
  State.DEVELOPMENT,
  State.ANALYSIS,
];

export class ComplexDiceAssignmentStrategy implements DiceAssignmentStrategy {
  constructor(
    private readonly expectedSpecialistRoll = 3.5,
    private readonly maxDicePerCard = 2,
  ) {}

  assignDice(board: Board): void {
    const jobSeekers: StateDice[] = [];
    let diceToAllocate = [...board.getDice()];
    const assignedCards = new Map<Card, DiceGroup>();
    const stateGroups = new Map<State, DiceGroup[]>();
    let maxDice = Math.min(this.maxDicePerCard, board.getDice().length);

    for (let attempt = maxDice; attempt <= board.getDice().length; attempt++) {
      jobSeekers.length = 0;
      diceToAllocate = [...board.getDice()];
      assignedCards.clear();
      stateGroups.clear();

      for (const state of COLUMN_PASS_ORDER) {
        if (diceToAllocate.length === 0) {
          continue;
        }

        const column = board.getStateColumn(state);
        const primary = (d: StateDice) => d.getActivity() === state;
        const secondary = (d: StateDice) => d.getActivity() !== state;

        const incompleteCards = column.getIncompleteCards().filter((c) => !c.isBlocked());
        const allWorkers = new Set(diceToAllocate.filter(primary));

        for (const seeker of jobSeekers) {
          allWorkers.add(seeker);
        }
        jobSeekers.length = 0;

        if (allWorkers.size === 0) {
          continue;
        }

        if (incompleteCards.length === 0) {
          jobSeekers.push(...allWorkers);
          continue;
        }

        for (const card of incompleteCards) {
          if (allWorkers.size === 0) {
            continue;
          }

          const preassignedGroup = assignedCards.get(card);
          if (preassignedGroup && preassignedGroup.getDice().length === maxDice) {
            continue;
          }
          if (preassignedGroup) {
            for (const die of preassignedGroup.getDice()) {
              allWorkers.add(die);
            }
          }

          const specialists = [...allWorkers].filter(primary);
          const secondaries = [...allWorkers].filter(secondary);
          let remainingWork = card.getRemainingWork(state);
          const allocatedDice: StateDice[] = [];
          let remainingDice = maxDice;

          if (specialists.length > 0) {
            const requiredSpecialistDie = Math.ceil(remainingWork / this.expectedSpecialistRoll);
            const maxSpecialistDice = Math.min(
              Math.min(requiredSpecialistDie, specialists.length),
              remainingDice,
            );
            remainingDice -= maxSpecialistDice;
            allocatedDice.push(...specialists.slice(0, maxSpecialistDice));
            remainingWork -= this.expectedSpecialistRoll * maxSpecialistDice;
          }

          if (
            column.canAssignSecondaryWorkers() &&
            secondaries.length > 0 &&
            remainingWork > 0
          ) {
            const expectedAwayRoll = this.expectedSpecialistRoll / 2;
            const requiredSecondaryDice = Math.ceil(remainingWork / expectedAwayRoll);
            const maxSecondaryDice = Math.min(
              Math.min(requiredSecondaryDice, secondaries.length),
              remainingDice,
            );
            allocatedDice.push(...secondaries.slice(0, maxSecondaryDice));
          }

          if (preassignedGroup) {
            preassignedGroup.setDice(allocatedDice);
          } else if (allocatedDice.length > 0) {
            const diceGroup = new DiceGroup(card, ...allocatedDice);
            assignedCards.set(card, diceGroup);
            const groups = stateGroups.get(state) ?? [];
            groups.push(diceGroup);
            stateGroups.set(state, groups);
          }

          for (const die of allocatedDice) {
            allWorkers.delete(die);
            const index = diceToAllocate.indexOf(die);
            if (index !== -1) {
              diceToAllocate.splice(index, 1);
            }
          }
        }

        if (allWorkers.size > 0) {
          jobSeekers.push(...allWorkers);
        }
      }

      for (const [state, groups] of stateGroups) {
        board.getStateColumn(state).assignDice(...groups);
      }

      if (jobSeekers.length > 0) {
        maxDice++;
      } else {
        break;
      }
    }
  }
}
