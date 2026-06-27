import type { Board } from './Board.js';
import type { Day } from './Day.js';
import type { CardEffectEvent } from './session/CardEffectEvent.js';

export class Context {
  private readonly effectEvents: CardEffectEvent[] = [];

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

  recordEffect(event: CardEffectEvent): void {
    this.effectEvents.push(event);
  }

  takeEffectEvents(): CardEffectEvent[] {
    return [...this.effectEvents];
  }
}
