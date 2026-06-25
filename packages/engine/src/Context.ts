import type { Board } from './Board.js';
import type { Day } from './Day.js';

export class Context {
  constructor(
    private readonly board: Board,
    private readonly day: Day,
  ) {}

  getBoard(): Board {
    return this.board;
  }

  getDay(): Day {
    return this.day;
  }
}
