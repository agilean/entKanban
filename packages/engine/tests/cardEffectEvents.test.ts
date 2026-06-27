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

  it('restores I2 test boost after snapshot reload without double reduction', () => {
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
    expect(s3.getRemainingWork(State.TEST)).toBe(4);

    const snapshot = captureBoardSnapshot(board);
    const restored = new Board();
    restored.clear();
    applyBoardSnapshot(restored, snapshot);

    expect(restored.getStateColumn(State.TEST).isI2TestBoostEnabled()).toBe(true);
    const s7 = getCard('S7');
    restored.getStateColumn(State.TEST).addCard(s7, ClassOfService.STANDARD);
    expect(s7.getRemainingWork(State.TEST)).toBe(6);
    expect(restored.findCardByName('S3')!.getRemainingWork(State.TEST)).toBe(4);
  });

  it('reduces test work when new cards enter test after I2 is active', () => {
    const board = new Board();
    board.clear();
    const i2 = getCard('I2');
    const s6 = getCard('S6');
    i2.onSelected(new Context(board, new Day(10)));
    s6.onSelected(new Context(board, new Day(10)));
    board.getStateColumn(State.TEST).addCard(i2, ClassOfService.STANDARD);
    i2.doWork(State.TEST, i2.getRemainingWork(State.TEST));
    board.advanceCard('test', 'ready', 'I2', new Context(board, new Day(12)));

    board.getStateColumn(State.DEVELOPMENT).addCard(s6, ClassOfService.STANDARD);
    s6.doWork(State.DEVELOPMENT, s6.getRemainingWork(State.DEVELOPMENT));
    expect(s6.getRemainingWork(State.TEST)).toBe(8);
    board.advanceCard('development', 'test', 'S6', new Context(board, new Day(13)));
    expect(s6.getRemainingWork(State.TEST)).toBe(6);
  });

  it('activates I2 when pulled into ready via ready column doTheWork', () => {
    const board = new Board();
    board.clear();
    const i2 = getCard('I2');
    const s3 = getCard('S3');
    i2.onSelected(new Context(board, new Day(10)));
    board.getStateColumn(State.TEST).addCard(i2, ClassOfService.STANDARD);
    board.getStateColumn(State.TEST).addCard(s3, ClassOfService.STANDARD);
    i2.doWork(State.TEST, i2.getRemainingWork(State.TEST));
    board.getStateColumn(State.TEST).promoteCompletedWork();

    const context = new Context(board, new Day(12));
    board.getReadyToDeploy().doTheWork(context);

    expect(board.getReadyToDeploy().getCards().some((card) => card.getName() === 'I2')).toBe(true);
    expect(board.getStateColumn(State.TEST).isI2TestBoostEnabled()).toBe(true);
    expect(s3.getRemainingWork(State.TEST)).toBe(4);
  });
});
