import type { Board } from '../Board.js';
import type { Instruction } from './Instruction.js';

export class DefectFound implements Instruction {
  execute(_board: Board): void {
    // Placeholder: defect handling is applied during stand up / work in full rules.
  }
}
