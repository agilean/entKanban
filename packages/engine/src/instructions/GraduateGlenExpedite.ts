import type { Board } from '../Board.js';
import { ClassOfService } from '../ClassOfService.js';
import { getCard } from '../card/Cards.js';
import type { Instruction } from './Instruction.js';

export class GraduateGlenExpedite implements Instruction {
  execute(board: Board): void {
    board.getOptions().addCard(getCard('E2'), ClassOfService.STANDARD);
  }
}
