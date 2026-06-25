import type { Board } from '../Board.js';
import { ClassOfService } from '../ClassOfService.js';
import { getCard } from '../card/Cards.js';
import type { Instruction } from './Instruction.js';

const SET_2_CARDS = [
  'S19',
  'S20',
  'S21',
  'S22',
  'S23',
  'S24',
  'S25',
  'S26',
  'S27',
  'S28',
] as const;

export class MargaretsFeatures implements Instruction {
  execute(board: Board): void {
    const backlog = board.getOptions();
    for (const name of SET_2_CARDS) {
      backlog.addCard(getCard(name), ClassOfService.STANDARD);
    }
  }
}
