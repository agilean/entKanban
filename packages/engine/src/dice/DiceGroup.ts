import type { State } from '../State.js';
import type { Card } from '../card/Card.js';
import type { StateDice } from './StateDice.js';

export class DiceGroup {
  private rolled = false;
  private dice: StateDice[];
  private dots = 0;
  private originalState?: State;

  constructor(
    private readonly card: Card,
    ...die: StateDice[]
  ) {
    this.dice = die;
  }

  rollFor(state: State): void {
    if (this.rolled) {
      throw new Error('Already rolled');
    }
    this.rolled = true;
    this.originalState = state;
    for (const d of this.dice) {
      this.dots += d.rollFor(state);
    }
    this.spendPoints(state, this.card);
    if (this.dice.length > 2) {
      this.dots = 0;
    }
  }

  getLeftoverPoints(): number {
    return this.dots;
  }

  spendLeftoverPoints(state: State, card: Card): void {
    if (state !== this.originalState) {
      throw new Error('Points must be spent in same specialisation die was originally rolled for');
    }
    this.spendPoints(state, card);
  }

  private spendPoints(state: State, card: Card): void {
    const delta = Math.min(this.dots, card.getRemainingWork(state));
    card.doWork(state, delta);
    this.dots -= delta;
  }

  getDice(): StateDice[] {
    return this.dice;
  }

  setDice(allocatedDice: StateDice[]): void {
    this.dice = allocatedDice;
  }

  getCard(): Card {
    return this.card;
  }
}
