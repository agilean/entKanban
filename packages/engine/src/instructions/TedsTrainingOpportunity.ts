import type { Board } from '../Board.js';
import { State } from '../State.js';
import type { Instruction } from './Instruction.js';

export class TedsTrainingOpportunity implements Instruction {
  constructor(private readonly training: boolean) {}

  execute(board: Board): void {
    if (!this.training) {
      return;
    }
    const testDice = board.getDiceForState(State.TEST);
    if (testDice.length > 0) {
      board.removeDice(testDice[0]!);
    }
  }
}
