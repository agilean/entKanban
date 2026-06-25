import type { Board } from '../Board.js';
import { State } from '../State.js';
import { RandomDice } from '../dice/RandomDice.js';
import { StateDice } from '../dice/StateDice.js';
import type { Instruction } from './Instruction.js';

export class CarlosFired implements Instruction {
  execute(board: Board): void {
    const column = board.getStateColumn(State.TEST);
    column.enableLimits();
    column.enableSecondaryWorkers();
    board.addDice(new StateDice(State.TEST, new RandomDice()));
  }
}
