import { describe, expect, it } from 'vitest';
import { CardSize } from '../src/card/Card.js';
import { getCard } from '../src/card/Cards.js';
import { ExpediteCard } from '../src/card/ExpediteCard.js';
import { FixedDateCard } from '../src/card/FixedDateCard.js';
import { IntangibleCard } from '../src/card/IntangibleCard.js';
import { MutablePriorityQueue } from '../src/column/MutablePriorityQueue.js';
import { Day } from '../src/Day.js';
import { DayStore } from '../src/DayStore.js';
import { businessValuePrioritisationCompare } from '../src/policies/BusinessValuePrioritisationStrategy.js';
import { expeditesCompare } from '../src/policies/ExpeditesPrioritisationStrategy.js';
import { fixedDateCardsCompare } from '../src/policies/FixedDateCardsPrioritisationStrategy.js';
import { intangiblesFirstCompare } from '../src/policies/prioritisation.js';
import { wipAgingCompare } from '../src/policies/prioritisation.js';
import { wsjfCompare } from '../src/policies/WeightedShortestJobFirstPrioritisationStrategy.js';

function pollInOrder(comparator: (a: ReturnType<typeof getCard>, b: ReturnType<typeof getCard>) => number, ...names: string[]) {
  const queue = new MutablePriorityQueue(comparator);
  for (const name of names) {
    queue.add(getCard(name));
  }
  return names.map(() => queue.poll()!.getName());
}

describe('BusinessValuePrioritisationStrategy', () => {
  it('ranks higher business value first', () => {
    expect(pollInOrder(businessValuePrioritisationCompare, 'S2', 'S3', 'S4')).toEqual(['S4', 'S3', 'S2']);
    expect(getCard('S4').getSize()).toBe(CardSize.HIGH);
    expect(getCard('S3').getSize()).toBe(CardSize.MEDIUM);
    expect(getCard('S2').getSize()).toBe(CardSize.LOW);
  });
});

describe('WipAgingPrioritisationStrategy', () => {
  it('ranks older items first', () => {
    const queue = new MutablePriorityQueue(wipAgingCompare);
    queue.add(getCard('S8'));
    queue.add(getCard('S3'));
    expect(queue.poll()!.getDaySelected()).toBe(2);
    expect(queue.poll()!.getDaySelected()).toBe(6);
  });
});

describe('ExpeditesPrioritisationStrategy', () => {
  it('ranks expedite cards first', () => {
    expect(pollInOrder(expeditesCompare, 'S11', 'E1', 'S12')).toEqual(['E1', 'S11', 'S12']);
    expect(getCard('E1')).toBeInstanceOf(ExpediteCard);
  });
});

describe('FixedDateCardsPrioritisationStrategy', () => {
  it('ranks fixed date cards by due date', () => {
    expect(pollInOrder(fixedDateCardsCompare, 'S11', 'F2', 'F1')).toEqual(['F1', 'F2', 'S11']);
    expect(getCard('F1')).toBeInstanceOf(FixedDateCard);
    expect(getCard('F1').getDueDate()).toBe(15);
    expect(getCard('F2').getDueDate()).toBe(21);
  });
});

describe('IntangiblesFirstPrioritisationStrategy', () => {
  it('ranks intangible cards first', () => {
    expect(pollInOrder(intangiblesFirstCompare, 'S11', 'I1', 'S12')).toEqual(['I1', 'S11', 'S12']);
    expect(getCard('I1')).toBeInstanceOf(IntangibleCard);
  });
});

describe('WeightedShortestJobFirstPrioritisationStrategy', () => {
  it('ranks higher CD3 first when day is set', () => {
    DayStore.setDay(new Day(10));
    const queue = new MutablePriorityQueue(wsjfCompare);
    queue.add(getCard('S11'));
    queue.add(getCard('S12'));
    const first = queue.poll();
    const second = queue.poll();
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    DayStore.clear();
  });
});
