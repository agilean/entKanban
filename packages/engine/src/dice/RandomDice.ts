import type { Dice } from './Dice.js';

export class RandomDice implements Dice {
  roll(): number {
    return 1 + Math.floor(Math.random() * 6);
  }
}
