import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { ClassOfService } from '../src/ClassOfService.js';
import { Context } from '../src/Context.js';
import { Day } from '../src/Day.js';
import { State } from '../src/State.js';
import { getCard } from '../src/card/Cards.js';
import { applyBoardSnapshot, captureBoardSnapshot } from '../src/session/boardSnapshot.js';

describe('card effect events', () => {
  it('records I1 continuous delivery when entering ready', () => {
    const board = new Board();
    board.clear();
    const i1 = getCard('I1');
    board.getStateColumn(State.TEST).addCard(i1, ClassOfService.STANDARD);
    i1.doWork(State.TEST, i1.getRemainingWork(State.TEST));

    const context = new Context(board, new Day(11));
    board.advanceCard('test', 'ready', 'I1', context);
    const effects = context.takeEffectEvents();

    expect(effects).toEqual([
      expect.objectContaining({ cardName: 'I1', kind: 'i1-continuous-delivery' }),
    ]);
    expect(board.getReadyToDeploy().getDeploymentFrequency()).toBe(1);
  });

  it('records I2 test boost once when entering ready', () => {
    const board = new Board();
    board.clear();
    const i2 = getCard('I2');
    const s3 = getCard('S3');
    i2.onSelected(new Context(board, new Day(10)));
    board.getStateColumn(State.TEST).addCard(i2, ClassOfService.STANDARD);
    board.getStateColumn(State.TEST).addCard(s3, ClassOfService.STANDARD);
    i2.doWork(State.TEST, i2.getRemainingWork(State.TEST));

    const context = new Context(board, new Day(12));
    board.advanceCard('test', 'ready', 'I2', context);
    expect(context.takeEffectEvents()).toEqual([
      expect.objectContaining({ cardName: 'I2', kind: 'i2-test-boost' }),
    ]);
    expect(s3.getRemainingWork(State.TEST)).toBe(4);

    const deployContext = new Context(board, new Day(15));
    board.advanceCard('ready', 'deployed', 'I2', deployContext);
    expect(deployContext.takeEffectEvents().some((e) => e.kind === 'i2-test-boost')).toBe(false);
  });

  it('records F1 on-time and late deploy outcomes', () => {
    const onTimeBoard = new Board();
    onTimeBoard.clear();
    const f1OnTime = getCard('F1');
    f1OnTime.onSelected(new Context(onTimeBoard, new Day(10)));
    onTimeBoard.getReadyToDeploy().addCard(f1OnTime, ClassOfService.STANDARD);
    const onTimeContext = new Context(onTimeBoard, new Day(15));
    onTimeBoard.advanceCard('ready', 'deployed', 'F1', onTimeContext);
    expect(onTimeContext.takeEffectEvents()).toEqual([
      expect.objectContaining({ kind: 'f1-on-time' }),
    ]);

    const lateBoard = new Board();
    lateBoard.clear();
    const f1Late = getCard('F1');
    f1Late.onSelected(new Context(lateBoard, new Day(10)));
    lateBoard.getReadyToDeploy().addCard(f1Late, ClassOfService.STANDARD);
    const lateContext = new Context(lateBoard, new Day(18));
    lateBoard.advanceCard('ready', 'deployed', 'F1', lateContext);
    expect(lateContext.takeEffectEvents()).toEqual([
      expect.objectContaining({ kind: 'f1-late-fine' }),
    ]);
  });

  it('restores I2 test boost after snapshot reload', () => {
    const board = new Board();
    board.clear();
    const i2 = getCard('I2');
    i2.onSelected(new Context(board, new Day(10)));
    board.getStateColumn(State.TEST).addCard(i2, ClassOfService.STANDARD);
    i2.doWork(State.TEST, i2.getRemainingWork(State.TEST));
    const context = new Context(board, new Day(12));
    board.advanceCard('test', 'ready', 'I2', context);

    const snapshot = captureBoardSnapshot(board);
    const restored = new Board();
    restored.clear();
    applyBoardSnapshot(restored, snapshot);

    expect(restored.getStateColumn(State.TEST).isI2TestBoostEnabled()).toBe(true);
    const s3 = getCard('S3');
    restored.getStateColumn(State.TEST).addCard(s3, ClassOfService.STANDARD);
    expect(s3.getRemainingWork(State.TEST)).toBe(4);
  });
});
