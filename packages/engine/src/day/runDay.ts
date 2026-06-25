import type { Board } from '../Board.js';
import { Context } from '../Context.js';
import type { Day } from '../Day.js';
import { DayStore } from '../DayStore.js';
import type { DaysFactory } from '../DaysFactory.js';

export function runDay(board: Board, day: Day): void {
  DayStore.setDay(day);
  day.standUp(board);
  day.doTheWork(new Context(board, day));
  day.endOfDay(board);
}

export function runDays(
  board: Board,
  fromDay: number,
  toDay: number,
  factory: DaysFactory,
): void {
  for (let ordinal = fromDay; ordinal <= toDay; ordinal++) {
    runDay(board, factory.getDay(ordinal));
  }
}
