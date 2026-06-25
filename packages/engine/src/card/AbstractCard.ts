import type { Context } from '../Context.js';
import type { Day } from '../Day.js';
import { State } from '../State.js';
import { type Card, type CardSize, Blocker } from './Card.js';

export abstract class AbstractCard implements Card {
  private readonly work: Record<State, number>;
  private daySelected = 0;
  private dayDeployed = 0;
  private blocker?: Blocker;

  constructor(
    private readonly name: string,
    private readonly size: CardSize,
    analysis: number,
    development: number,
    test: number,
    daySelected = 0,
    dayDeployed = 0,
  ) {
    this.work = {
      [State.ANALYSIS]: analysis,
      [State.DEVELOPMENT]: development,
      [State.TEST]: test,
    };
    this.daySelected = daySelected;
    this.dayDeployed = dayDeployed;
  }

  getRemainingWork(state?: State): number {
    if (state !== undefined) {
      return this.work[state];
    }
    return (
      this.work[State.ANALYSIS] +
      this.work[State.DEVELOPMENT] +
      this.work[State.TEST]
    );
  }

  doWork(state: State, effort: number): void {
    const remaining = this.getRemainingWork(state);
    if (effort > remaining) {
      throw new Error('Effort exceeds remaining work');
    }
    this.work[state] = remaining - effort;
  }

  getName(): string {
    return this.name;
  }

  getSize(): CardSize {
    return this.size;
  }

  getDaySelected(): number {
    return this.daySelected;
  }

  getDayDeployed(): number {
    return this.dayDeployed;
  }

  getCycleTime(): number {
    if (this.getDaySelected() === 0 || this.getDayDeployed() === 0) {
      throw new Error('Cycle time requires selected and deployed days');
    }
    return Math.max(1, this.getDayDeployed() - this.getDaySelected());
  }

  onSelected(context: Context): void {
    this.daySelected = context.getDay().getOrdinal();
  }

  onReadyToDeploy(_context: Context): void {}

  onDeployed(context: Context): void {
    if (this.daySelected === 0 && !this.isFixedDateCard()) {
      throw new Error(`Cannot deploy unselected card ${this.getName()}`);
    }
    if (context.getDay().getOrdinal() < this.daySelected) {
      throw new Error('Cannot deploy before selection day');
    }
    this.dayDeployed = context.getDay().getOrdinal();
  }

  protected isFixedDateCard(): boolean {
    return false;
  }

  getFineOrPayment(): number {
    return 0;
  }

  getDueDate(): number {
    return -1;
  }

  setBlocker(blocker: Blocker): void {
    this.blocker = blocker;
  }

  getBlocker(): Blocker | undefined {
    return this.blocker;
  }

  isBlocked(): boolean {
    return this.blocker !== undefined && this.blocker.getRemainingWork() > 0;
  }

  isExpeditable(_day: Day): boolean {
    return false;
  }

  abstract getSubscribers(): number;
  abstract getCostOfDelay(day: Day): number;

  captureWorkSnapshot(): {
    name: string;
    analysis: number;
    development: number;
    test: number;
    daySelected: number;
    dayDeployed: number;
    blockerRemaining?: number;
  } {
    const blocker = this.getBlocker();
    return {
      name: this.getName(),
      analysis: this.getRemainingWork(State.ANALYSIS),
      development: this.getRemainingWork(State.DEVELOPMENT),
      test: this.getRemainingWork(State.TEST),
      daySelected: this.daySelected,
      dayDeployed: this.dayDeployed,
      blockerRemaining: blocker && blocker.getRemainingWork() > 0 ? blocker.getRemainingWork() : undefined,
    };
  }

  restoreWorkSnapshot(snapshot: {
    analysis: number;
    development: number;
    test: number;
    daySelected: number;
    dayDeployed: number;
    blockerRemaining?: number;
  }): void {
    this.work[State.ANALYSIS] = snapshot.analysis;
    this.work[State.DEVELOPMENT] = snapshot.development;
    this.work[State.TEST] = snapshot.test;
    this.daySelected = snapshot.daySelected;
    this.dayDeployed = snapshot.dayDeployed;
    if (snapshot.blockerRemaining !== undefined && snapshot.blockerRemaining > 0) {
      this.blocker = Blocker.withRemaining(snapshot.blockerRemaining);
    } else {
      this.blocker = undefined;
    }
  }

  toString(): string {
    const blocked = this.isBlocked() ? ' (BLOCKED)' : '';
    return `${this.getName()}[${this.getRemainingWork(State.ANALYSIS)}/${this.getRemainingWork(State.DEVELOPMENT)}/${this.getRemainingWork(State.TEST)}]${blocked}`;
  }
}
