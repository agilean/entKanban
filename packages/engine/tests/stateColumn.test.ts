import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { ClassOfService } from '../src/ClassOfService.js';
import { Context } from '../src/Context.js';
import { Day } from '../src/Day.js';
import { State } from '../src/State.js';
import { Blocker } from '../src/card/Card.js';
import { getCard } from '../src/card/Cards.js';
import { DiceGroup } from '../src/dice/DiceGroup.js';
import { StateDice } from '../src/dice/StateDice.js';
import { NullColumn } from '../src/column/NullColumn.js';
import { StateColumn } from '../src/column/StateColumn.js';
import { businessValueCompare } from '../src/policies/prioritisation.js';
import { LoadedDice } from './helpers/LoadedDice.js';

describe('StateColumn', () => {
  it('reduces card work when doing work', () => {
    const card = getCard('S1');
    const column = new StateColumn(State.ANALYSIS, Number.MAX_SAFE_INTEGER, new NullColumn(), new NullColumn());
    column.addCard(card, ClassOfService.STANDARD);

    const dice = new StateDice(State.ANALYSIS, new LoadedDice(6));
    column.assignDice(new DiceGroup(column.getCards()[0]!, dice));

    column.doTheWork(new Context(new Board(), new Day(1)));

    expect(card.getRemainingWork(State.ANALYSIS)).toBe(0);
  });

  it('skips blocked cards when spending leftover points', () => {
    const column = new StateColumn(State.ANALYSIS, Number.MAX_SAFE_INTEGER, new NullColumn(), new NullColumn());
    const open = getCard('S8');
    const blocked = getCard('S12');
    blocked.setBlocker(new Blocker());
    column.addCard(open, ClassOfService.STANDARD);
    column.addCard(blocked, ClassOfService.STANDARD);

    const group = new DiceGroup(open, new StateDice(State.ANALYSIS, new LoadedDice(10)));
    column.assignDice(group);
    column.doTheWork(new Context(new Board(), new Day(10)));

    expect(open.getRemainingWork(State.ANALYSIS)).toBe(0);
    expect(blocked.getRemainingWork(State.ANALYSIS)).toBe(5);
  });

  it('makes finished card pullable', () => {
    const context = new Context(new Board(), new Day(1));
    const column = new StateColumn(State.ANALYSIS, Number.MAX_SAFE_INTEGER, new NullColumn(), new NullColumn());
    const card = getCard('S1');
    column.addCard(card, ClassOfService.STANDARD);

    const dice = new StateDice(State.ANALYSIS, new LoadedDice(6));
    column.assignDice(new DiceGroup(column.getCards()[0]!, dice));
    column.doTheWork(context);

    expect(column.pull(context, ClassOfService.STANDARD)?.getName()).toBe('S1');
  });

  it('can pull from upstream', () => {
    const analysis = new StateColumn(State.ANALYSIS, Number.MAX_SAFE_INTEGER, new NullColumn(), new NullColumn());
    const s8 = getCard('S8');
    analysis.addCard(s8, ClassOfService.STANDARD);

    const development = new StateColumn(State.DEVELOPMENT, Number.MAX_SAFE_INTEGER, analysis, new NullColumn());
    expect(development.getIncompleteCards()).toHaveLength(0);

    const dice = new StateDice(State.ANALYSIS, new LoadedDice(6));
    analysis.assignDice(new DiceGroup(analysis.getCards()[0]!, dice));
    analysis.doTheWork(new Context(new Board(), new Day(1)));
    development.doTheWork(new Context(new Board(), new Day(1)));

    expect(analysis.getIncompleteCards().map((c) => c.getName())).not.toContain('S8');
    expect(development.getIncompleteCards().map((c) => c.getName())).toContain('S8');
  });

  it('promoteCompletedWork moves interactive dice-completed cards to done zone', () => {
    const context = new Context(new Board(), new Day(9));
    const column = new StateColumn(State.TEST, Number.MAX_SAFE_INTEGER, new NullColumn(), new NullColumn());
    const card = getCard('S3');
    column.addCard(card, ClassOfService.STANDARD);

    card.doWork(State.TEST, card.getRemainingWork(State.TEST));
    expect(column.pull(context, ClassOfService.STANDARD)).toBeUndefined();

    column.promoteCompletedWork();
    expect(column.pull(context, ClassOfService.STANDARD)?.getName()).toBe('S3');
  });

  it('returns wip limit', () => {
    const column = new StateColumn(State.ANALYSIS, 4, new NullColumn(), new NullColumn());
    expect(column.getLimit()).toBe(4);
  });

  it('cannot exceed wip limit', () => {
    const column = new StateColumn(State.ANALYSIS, 1, new NullColumn(), new NullColumn());
    column.addCard(getCard('S1'), ClassOfService.STANDARD);
    expect(() => column.addCard(getCard('S2'), ClassOfService.STANDARD)).toThrow();
  });

  it('can change priority', () => {
    const column = new StateColumn(State.ANALYSIS, 2, new NullColumn(), new NullColumn());
    column.addCard(getCard('S10'), ClassOfService.STANDARD);
    column.addCard(getCard('S5'), ClassOfService.STANDARD);

    expect(column.getCards()[0]!.getName()).toBe('S5');
    column.orderBy(businessValueCompare);
    expect(column.getCards()[0]!.getName()).toBe('S10');
  });
});
