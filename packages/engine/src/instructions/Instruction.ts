import type { Board } from '../Board.js';

export interface Instruction {
  execute(board: Board): void;
}
