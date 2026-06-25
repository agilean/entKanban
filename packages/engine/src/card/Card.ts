import type { State } from '../State.js';
import type { Day } from '../Day.js';
import type { Context } from '../Context.js';

export enum CardSize {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NONE = 'NONE',
}

const SIZE_ORDER: Record<CardSize, number> = {
  [CardSize.VERY_HIGH]: 0,
  [CardSize.HIGH]: 1,
  [CardSize.MEDIUM]: 2,
  [CardSize.LOW]: 3,
  [CardSize.NONE]: 4,
};

export function compareCardSize(a: CardSize, b: CardSize): number {
  return SIZE_ORDER[a] - SIZE_ORDER[b];
}

export interface Card {
  getName(): string;
  getSize(): CardSize;
  getRemainingWork(state: State): number;
  getRemainingWork(): number;
  doWork(state: State, effort: number): void;
  onSelected(context: Context): void;
  onDeployed(context: Context): void;
  onReadyToDeploy(context: Context): void;
  getDaySelected(): number;
  getDayDeployed(): number;
  getSubscribers(): number;
  getCycleTime(): number;
  getFineOrPayment(): number;
  getDueDate(): number;
  setBlocker(blocker: Blocker): void;
  getBlocker(): Blocker | undefined;
  isBlocked(): boolean;
  isExpeditable(day: Day): boolean;
  getCostOfDelay(day: Day): number;
}

export class Blocker {
  private work = 7;

  static withRemaining(work: number): Blocker {
    const blocker = new Blocker();
    blocker.work = work;
    return blocker;
  }

  getRemainingWork(): number {
    return this.work;
  }

  doWork(work: number): void {
    this.work -= work;
  }
}
