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
  private i2TestBoostEnabled = false;

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

  getExpeditableStandardCards(day: Day): Card[] {
    return this.stdTodo.stream().filter((c) => c.isExpeditable(day));
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

  promoteCompletedWork(): void {
    for (const cos of [ClassOfService.STANDARD, ClassOfService.EXPEDITE]) {
      for (const card of this.todo(cos).stream()) {
        if (card.getRemainingWork(this.state) === 0) {
          this.todo(cos).remove(card);
          this.done(cos).add(card);
        }
      }
    }
  }

  enableI2TestBoost(): boolean {
    if (this.state !== State.TEST || this.i2TestBoostEnabled) {
      return false;
    }
    this.i2TestBoostEnabled = true;
    for (const card of this.getIncompleteCards()) {
      card.doWork(State.TEST, Math.min(2, card.getRemainingWork(State.TEST)));
    }
    this.attachI2TestBoostListener();
    return true;
  }

  restoreI2TestBoost(): void {
    if (this.state !== State.TEST || this.i2TestBoostEnabled) {
      return;
    }
    this.i2TestBoostEnabled = true;
    this.attachI2TestBoostListener();
  }

  private attachI2TestBoostListener(): void {
    this.addListener({
      cardAdded: (card) => {
        card.doWork(State.TEST, Math.min(2, card.getRemainingWork(State.TEST)));
      },
    });
  }

  isI2TestBoostEnabled(): boolean {
    return this.i2TestBoostEnabled;
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

  manualExpedite(card: Card, day: Day): void {
    if (!this.stdTodo.contains(card)) {
      throw new Error(`Card not in standard queue: ${card.getName()}`);
    }
    if (!card.isExpeditable(day)) {
      throw new Error(`Card not expeditable: ${card.getName()}`);
    }
    this.stdTodo.remove(card);
    this.expTodo.add(card);
  }

  removeCard(card: Card): { cos: ClassOfService; done: boolean } | null {
    if (this.stdTodo.remove(card)) {
      return { cos: ClassOfService.STANDARD, done: false };
    }
    if (this.stdDone.remove(card)) {
      return { cos: ClassOfService.STANDARD, done: true };
    }
    if (this.expTodo.remove(card)) {
      return { cos: ClassOfService.EXPEDITE, done: false };
    }
    if (this.expDone.remove(card)) {
      return { cos: ClassOfService.EXPEDITE, done: true };
    }
    return null;
  }

  clearDiceAssignments(): void {
    this.groups = [];
    this.rolled = false;
  }

  clear(): void {
    this.expTodo.clear();
    this.stdTodo.clear();
    this.expDone.clear();
    this.stdDone.clear();
    this.groups = [];
    this.rolled = false;
    this.secondaryWorkers = true;
    this.i2TestBoostEnabled = false;
    this.listeners.clear();
    this.enableLimits();
  }

  getPlacementSnapshot(): Array<{ name: string; cos: ClassOfService; done: boolean }> {
    const slots: Array<{ name: string; cos: ClassOfService; done: boolean }> = [];
    for (const card of this.stdTodo.stream()) {
      slots.push({ name: card.getName(), cos: ClassOfService.STANDARD, done: false });
    }
    for (const card of this.stdDone.stream()) {
      slots.push({ name: card.getName(), cos: ClassOfService.STANDARD, done: true });
    }
    for (const card of this.expTodo.stream()) {
      slots.push({ name: card.getName(), cos: ClassOfService.EXPEDITE, done: false });
    }
    for (const card of this.expDone.stream()) {
      slots.push({ name: card.getName(), cos: ClassOfService.EXPEDITE, done: true });
    }
    return slots;
  }

  restorePlacements(
    placements: Array<{ name: string; cos: ClassOfService; done: boolean }>,
    cardsByName: Map<string, Card>,
  ): void {
    for (const placement of placements) {
      const card = cardsByName.get(placement.name);
      if (!card) {
        throw new Error(`Unknown card: ${placement.name}`);
      }
      if (placement.done && card.getRemainingWork(this.state) > 0) {
        card.doWork(this.state, card.getRemainingWork(this.state));
      }
      const queue = placement.done ? this.done(placement.cos) : this.todo(placement.cos);
      queue.add(card);
    }
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
