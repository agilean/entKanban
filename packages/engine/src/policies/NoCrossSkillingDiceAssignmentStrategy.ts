import type { Board } from '../Board.js';
import { State } from '../State.js';
import { DiceGroup } from '../dice/DiceGroup.js';
import type { DiceAssignmentStrategy } from './DiceAssignmentStrategy.js';

export class NoCrossSkillingDiceAssignmentStrategy implements DiceAssignmentStrategy {
  assignDice(board: Board): void {
    for (const state of Object.values(State)) {
      const column = board.getStateColumn(state);
      const dice = board.getDiceForState(state);
      const card = column.getIncompleteCards().find((c) => !c.isBlocked());
      if (card && dice.length > 0) {
        column.assignDice(new DiceGroup(card, ...dice));
      }
    }
  }
}
