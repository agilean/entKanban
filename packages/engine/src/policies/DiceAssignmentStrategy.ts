import type { Board } from '../Board.js';

export interface DiceAssignmentStrategy {
  assignDice(board: Board): void;
}
