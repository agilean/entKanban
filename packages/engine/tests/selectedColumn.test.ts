import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { ClassOfService } from '../src/ClassOfService.js';
import { Context } from '../src/Context.js';
import { Day } from '../src/Day.js';
import { getCard } from '../src/card/Cards.js';
import { Options } from '../src/column/Options.js';
import { SelectedColumn } from '../src/column/SelectedColumn.js';
import { NullColumn } from '../src/column/NullColumn.js';
import { businessValueCompare } from '../src/policies/prioritisation.js';

describe('SelectedColumn', () => {
  it('marks selected day on pull', () => {
    const card = getCard('S10');
    const backlog = new Options();
    backlog.addCard(card, ClassOfService.STANDARD);

    const selected = new SelectedColumn(1, backlog);
    selected.doTheWork(new Context(new Board(), new Day(1)));

    expect(card.getDaySelected()).toBe(1);
  });

  it('returns wip limit', () => {
    const column = new SelectedColumn(4, new NullColumn());
    expect(column.getLimit()).toBe(4);
  });

  it('cannot exceed wip limit on add', () => {
    const column = new SelectedColumn(1, new NullColumn());
    column.addCard(getCard('S1'), ClassOfService.STANDARD);
    expect(() => column.addCard(getCard('S2'), ClassOfService.STANDARD)).toThrow();
  });

  it('will not pull beyond wip limit', () => {
    const backlog = new Options();
    const selected = new SelectedColumn(1, backlog);

    backlog.addCard(getCard('S1'), ClassOfService.STANDARD);
    selected.addCard(getCard('S2'), ClassOfService.STANDARD);

    selected.doTheWork(new Context(new Board(), new Day(1)));
    expect(selected.getCards()).toHaveLength(1);
  });

  it('can change priority', () => {
    const selected = new SelectedColumn(2, new NullColumn());
    selected.addCard(getCard('S10'), ClassOfService.STANDARD);
    selected.addCard(getCard('S5'), ClassOfService.STANDARD);

    expect(selected.getCards()[0]!.getName()).toBe('S5');

    selected.orderBy(businessValueCompare);

    expect(selected.getCards()[0]!.getName()).toBe('S10');
  });
});
