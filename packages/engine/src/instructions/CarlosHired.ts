import type { Board } from '../Board.js';
import { State } from '../State.js';
import type { Instruction } from './Instruction.js';

export class CarlosHired implements Instruction {
  execute(board: Board): void {
    const column = board.getStateColumn(State.TEST);
    column.disableLimits();
    column.disableSecondaryWorkers();
  }
}
