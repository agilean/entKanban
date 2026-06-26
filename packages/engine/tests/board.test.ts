import { describe, expect, it } from 'vitest';
import { ClassOfService } from '../src/ClassOfService.js';
import { Board } from '../src/Board.js';
import { Context } from '../src/Context.js';
import { DaysFactory } from '../src/DaysFactory.js';
import { State } from '../src/State.js';
import { getCard } from '../src/card/Cards.js';

function cardNames(cards: { getName(): string }[]): string[] {
  return cards.map((c) => c.getName());
}

function sortCardNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const prefix = a[0]!.localeCompare(b[0]!);
    if (prefix !== 0) return prefix;
    return Number(a.slice(1)) - Number(b.slice(1));
  });
}

describe('Board initial layout', () => {
  it('matches Java Board.initCards()', () => {
    const board = new Board();

    expect(cardNames(board.getDeployed().getCards())).toEqual(['S1', 'S2', 'S4']);
    expect(cardNames(board.getStateColumn(State.TEST).getCards())).toEqual(['S3']);
    expect(sortCardNames(cardNames(board.getStateColumn(State.DEVELOPMENT).getCards()))).toEqual([
      'S5',
      'S6',
      'S7',
      'S9',
    ]);
    expect(sortCardNames(cardNames(board.getStateColumn(State.ANALYSIS).getCards()))).toEqual(['S8', 'S10']);
    expect(cardNames(board.getSelected().getCards())).toEqual(['S13']);
    expect(sortCardNames(cardNames(board.getOptions().getCards()))).toEqual([
      'F1',
      'F2',
      'I1',
      'I2',
      'I3',
      'S11',
      'S12',
      'S14',
      'S15',
      'S16',
      'S17',
      'S18',
    ]);
  });

  it('starts with seven dice', () => {
    const board = new Board();
    expect(board.getDice()).toHaveLength(7);
    expect(board.getDiceForState(State.ANALYSIS)).toHaveLength(2);
    expect(board.getDiceForState(State.DEVELOPMENT)).toHaveLength(3);
    expect(board.getDiceForState(State.TEST)).toHaveLength(2);
  });

  it('creates independent card instances via getCard', () => {
    const a = getCard('S1');
    const b = getCard('S1');
    expect(a).not.toBe(b);
    expect(a.getName()).toBe(b.getName());
  });
});

describe('Board advanceCard', () => {
  it('moves a done development card to test during replenish flow', () => {
    const board = new Board();
    const day = new DaysFactory(false).getDay(10);
    const context = new Context(board, day);

    expect(board.findCardByName('S5')).toBeDefined();
    expect(
      board.getStateColumn(State.DEVELOPMENT).getCards().some((c) => c.getName() === 'S5'),
    ).toBe(true);

    board.advanceCard('development', 'test', 'S5', context);

    expect(
      board.getStateColumn(State.DEVELOPMENT).getCards().some((c) => c.getName() === 'S5'),
    ).toBe(false);
    expect(board.getStateColumn(State.TEST).getCards().some((c) => c.getName() === 'S5')).toBe(true);
  });

  it('rejects advance when remaining work exists in source column', () => {
    const board = new Board();

    const check = board.canAdvanceCard('development', 'test', 'S6');
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.reason).toMatch(/development|S6|开发/);
    }
  });

  it('rejects pull when selected wip is full', () => {
    const board = new Board();
    const context = new Context(board, new DaysFactory(false).getDay(10));

    while (board.getSelected().getCards().length < board.getSelected().getLimit()) {
      const next = board.getOptions().getCards()[0]?.getName();
      if (!next) {
        break;
      }
      board.getOptions().reorder([next, ...board.getOptions().getCards().map((c) => c.getName()).filter((n) => n !== next)]);
      const card = board.getOptions().pull(context, ClassOfService.STANDARD);
      if (!card) {
        break;
      }
      card.onSelected(context);
      board.getSelected().addCard(card, ClassOfService.STANDARD);
    }

    const blocked = board.getOptions().getCards()[0]?.getName();
    expect(blocked).toBeDefined();
    const check = board.canPullToSelected(blocked!);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.reason).toMatch(/WIP|已满/);
    }
  });
});
