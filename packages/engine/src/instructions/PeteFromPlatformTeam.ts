import type { Board } from '../Board.js';
import { Blocker } from '../card/Card.js';
import type { Instruction } from './Instruction.js';

export class PeteFromPlatformTeam implements Instruction {
  execute(board: Board): void {
    const s10 = board.getCards().find((c) => c.getName() === 'S10');
    if (s10) {
      s10.setBlocker(new Blocker());
    }
  }
}
