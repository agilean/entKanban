import type { Board } from '../Board.js';
import { State } from '../State.js';
import { RandomDice } from '../dice/RandomDice.js';
import { StateDice } from '../dice/StateDice.js';
import type { Instruction } from './Instruction.js';

export class TammyHired implements Instruction {
  constructor(private readonly training: boolean) {}

  execute(board: Board): void {
    if (!this.training) {
      return;
    }
    board.addDice(new StateDice(State.TEST, new RandomDice()));
    board.addDice(new StateDice(State.TEST, new RandomDice()));
  }
}
