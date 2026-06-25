import type { State } from '../State.js';
import type { Dice } from './Dice.js';

export class StateDice {
  constructor(
    private readonly state: State,
    private readonly dice: Dice,
  ) {}

  getActivity(): State {
    return this.state;
  }

  rollFor(state: State): number {
    if (this.state === state) {
      return this.dice.roll();
    }
    return Math.round(this.dice.roll() / 2);
  }

  toString(): string {
    return this.state.substring(0, 1);
  }
}
