import type { Dice } from '../../src/dice/Dice.js';

export class LoadedDice implements Dice {
  constructor(private readonly value: number) {}

  roll(): number {
    return this.value;
  }
}
