import { describe, expect, it } from 'vitest';
import { ClassOfService } from '../src/ClassOfService.js';
import { Context } from '../src/Context.js';
import { Day } from '../src/Day.js';
import { Board } from '../src/Board.js';
import { getCard } from '../src/card/Cards.js';
import { Options } from '../src/column/Options.js';
import { SelectedColumn } from '../src/column/SelectedColumn.js';
import { DeployedColumn } from '../src/column/DeployedColumn.js';
import { NullColumn } from '../src/column/NullColumn.js';

describe('DeployedColumn', () => {
  it('marks deployed day on pull', () => {
    const card = getCard('S10');
    const backlog = new Options();
    backlog.addCard(card, ClassOfService.STANDARD);

    const selected = new SelectedColumn(1, backlog);
    selected.doTheWork(new Context(new Board(), new Day(1)));

    const deployed = new DeployedColumn(selected, new NullColumn());
    deployed.doTheWork(new Context(new Board(), new Day(2)));

    expect(card.getDayDeployed()).toBe(2);
  });
});
