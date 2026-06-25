import { ClassOfService } from '../ClassOfService.js';
import type { Context } from '../Context.js';
import type { Day } from '../Day.js';
import { State } from '../State.js';
import type { Card } from '../card/Card.js';
import type { DiceGroup } from '../dice/DiceGroup.js';
import { wipAgingCompare } from '../policies/prioritisation.js';
import type { Column, ColumnListener } from './Column.js';
import { LimitedColumn } from './LimitedColumn.js';
import { MutablePriorityQueue } from './MutablePriorityQueue.js';

export class StateColumn extends LimitedColumn {
  private readonly stdTodo = new MutablePriorityQueue<Card>(wipAgingCompare);
  private readonly stdDone = new MutablePriorityQueue<Card>(wipAgingCompare);
  private readonly expTodo = new MutablePriorityQueue<Card>(wipAgingCompare);
  private readonly expDone = new MutablePriorityQueue<Card>(wipAgingCompare);
  private rolled = false;
  private groups: DiceGroup[] = [];
  private comparator: (a: Card, b: Card) => number = wipAgingCompare;
  private readonly listeners = new Set<ColumnListener>();
  private secondaryWorkers = true;

  constructor(
    private readonly state: State,
    limit: number,
    private readonly standard: Column,
    private readonly expedite: Column,
  ) {
    super(limit);
  }

  addCard(card: Card, cos: ClassOfService): void {
    if (this.getCardsForCos(cos).length === this.getLimitForCos(cos)) {
      throw new Error(`Too many cards in ${cos}`);
    }
    if (card.getRemainingWork(this.state) === 0) {
      this.done(cos).add(card);
    } else {
      this.listeners.forEach((l) => l.cardAdded(card));
      this.todo(cos).add(card);
    }
  }

  getCards(): Card[] {
    return [
      ...this.stdTodo.stream(),
      ...this.stdDone.stream(),
      ...this.expTodo.stream(),
      ...this.expDone.stream(),
    ].sort(this.comparator);
  }

  getCardsForCos(cos: ClassOfService): Card[] {
    return [...this.todo(cos).stream(), ...this.done(cos).stream()].sort(this.comparator);
  }

  assignDice(...groups: DiceGroup[]): void {
    this.groups = [...groups];
    this.rolled = false;
  }

  getIncompleteCards(): Card[] {
    return [...this.expTodo.stream(), ...this.stdTodo.stream()].sort(this.comparator);
  }

  pull(context: Context, cos: ClassOfService): Card | undefined {
    this.doTheWork(context);
    return this.done(cos).poll();
  }

  doTheWork(context: Context): void {
    this.reduceWorkOnAssignedTickets();
    this.spendLeftoverPoints(context, ClassOfService.EXPEDITE);
    this.spendLeftoverPoints(context, ClassOfService.STANDARD);
  }

  private todo(cos: ClassOfService): MutablePriorityQueue<Card> {
    return cos === ClassOfService.STANDARD ? this.stdTodo : this.expTodo;
  }

  private done(cos: ClassOfService): MutablePriorityQueue<Card> {
    return cos === ClassOfService.STANDARD ? this.stdDone : this.expDone;
  }

  private upstream(cos: ClassOfService): Column {
    return cos === ClassOfService.STANDARD ? this.standard : this.expedite;
  }

  private getLimitForCos(cos: ClassOfService): number {
    return cos === ClassOfService.EXPEDITE ? Number.MAX_SAFE_INTEGER : this.getLimit();
  }

  private spendLeftoverPoints(context: Context, cos: ClassOfService): void {
    while (this.getCardsForCos(cos).length < this.getLimitForCos(cos)) {
      const card = this.upstream(cos).pull(context, cos);
      if (!card) {
        break;
      }
      this.addCard(card, cos);
    }

    if (this.groups.length === 0) {
      return;
    }

    if (this.todo(cos).stream().filter((c) => !c.isBlocked()).length === 0) {
      return;
    }

    for (const group of this.groups) {
      this.todo(cos)
        .stream()
        .filter((c) => !c.isBlocked())
        .forEach((c) => group.spendLeftoverPoints(this.state, c));

      this.todo(cos)
        .stream()
        .filter((c) => c.getRemainingWork(this.state) === 0)
        .forEach((c) => {
          this.done(cos).add(c);
        });

      this.todo(cos).removeIf((c) => c.getRemainingWork(this.state) === 0);
    }

    this.groups = this.groups.filter((g) => g.getLeftoverPoints() > 0);
  }

  private reduceWorkOnAssignedTickets(): void {
    if (this.rolled) {
      return;
    }
    this.rolled = true;

    if (this.groups.length === 0) {
      return;
    }

    for (const group of this.groups) {
      group.rollFor(this.state);
      const groupCard = group.getCard();
      for (const cos of Object.values(ClassOfService)) {
        if (groupCard.getRemainingWork(this.state) === 0 && this.todo(cos).contains(groupCard)) {
          this.todo(cos).remove(groupCard);
          this.done(cos).add(groupCard);
        }
      }
    }

    this.groups = this.groups.filter((g) => g.getLeftoverPoints() > 0);
  }

  orderBy(comparator: (a: Card, b: Card) => number): void {
    this.comparator = comparator;
    this.stdTodo.setComparator(comparator);
    this.stdDone.setComparator(comparator);
  }

  addListener(listener: ColumnListener): void {
    this.listeners.add(listener);
  }

  expediteTickets(day: Day): void {
    const expeditables = this.stdTodo
      .stream()
      .filter((c) => c.isExpeditable(day));
    for (const card of expeditables) {
      this.stdTodo.remove(card);
      this.expTodo.add(card);
    }
  }

  clear(): void {
    this.expTodo.clear();
    this.stdTodo.clear();
    this.expDone.clear();
    this.stdDone.clear();
  }

  canAssignSecondaryWorkers(): boolean {
    return this.secondaryWorkers;
  }

  disableSecondaryWorkers(): void {
    this.secondaryWorkers = false;
  }

  enableSecondaryWorkers(): void {
    this.secondaryWorkers = true;
  }

  toString(): string {
    const wip = this.getLimit() === Number.MAX_SAFE_INTEGER ? '∞' : String(this.getLimit());
    return `[${this.state} (${this.stdTodo.size}/${this.stdDone.size}/${wip})]`;
  }
}
