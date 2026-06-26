import { describe, expect, it } from 'vitest';
import { GamePhase } from '../src/session/GamePhase.js';
import { GameSession } from '../src/session/GameSession.js';
import { State } from '../src/State.js';
import { WipLimitAdjustment } from '../src/WipLimitAdjustment.js';

function confirm(session: GameSession): void {
  const result = session.dispatch({ type: 'confirm-phase' });
  expect(result.ok).toBe(true);
}

function walkStandUp(session: GameSession): void {
  confirm(session);
  confirm(session);
  confirm(session);
  confirm(session);
}

describe('GameSession', () => {
  it('starts at day 9 setup with initial board', () => {
    const session = GameSession.createNew();
    expect(session.getCurrentDay()).toBe(9);
    expect(session.getPhase()).toBe(GamePhase.SETUP);
    expect(session.getBoard().getDeployed().getCards().length).toBe(3);
    expect(session.getPendingActions().some((a) => a.kind === 'adjust-wip')).toBe(true);
  });

  it('rejects the fourth wip adjustment', () => {
    const session = GameSession.createNew();
    const adjustment = (day: number) =>
      new WipLimitAdjustment(day, 0, 2, 2, 4, 3);

    expect(session.dispatch({ type: 'adjust-wip-limits', adjustment: adjustment(11) }).ok).toBe(true);
    expect(session.dispatch({ type: 'adjust-wip-limits', adjustment: adjustment(12) }).ok).toBe(true);
    expect(session.dispatch({ type: 'adjust-wip-limits', adjustment: adjustment(13) }).ok).toBe(true);
    const fourth = session.dispatch({ type: 'adjust-wip-limits', adjustment: adjustment(14) });
    expect(fourth.ok).toBe(false);
  });

  it('reorders backlog during replenish', () => {
    const session = GameSession.createNew();
    confirm(session);
    confirm(session);

    expect(session.getPhase()).toBe(GamePhase.REPLENISH);
    const original = session.getBoard().getOptions().getCards().map((c) => c.getName());
    const reversed = [...original].reverse();
    const result = session.dispatch({ type: 'reorder-backlog', cardNames: reversed });
    expect(result.ok).toBe(true);
    expect(session.getBoard().getOptions().getCards().map((c) => c.getName())).toEqual(reversed);
  });

  it('reorders backlog during adjust-wip', () => {
    const session = GameSession.createNew();
    confirm(session);

    expect(session.getPhase()).toBe(GamePhase.ADJUST_WIP);
    const original = session.getBoard().getOptions().getCards().map((c) => c.getName());
    const reversed = [...original].reverse();
    const result = session.dispatch({ type: 'reorder-backlog', cardNames: reversed });
    expect(result.ok).toBe(true);
    expect(session.getBoard().getOptions().getCards().map((c) => c.getName())).toEqual(reversed);
  });

  it('pulls a backlog card into selected during replenish', () => {
    const session = GameSession.createNew();
    confirm(session);
    confirm(session);

    const topCard = session.getBoard().getOptions().getCards()[0]!.getName();
    const result = session.dispatch({ type: 'pull-to-selected', cardName: topCard });
    expect(result.ok).toBe(true);
    expect(session.getBoard().getSelected().getCards().map((c) => c.getName())).toContain(topCard);
    expect(session.getBoard().getOptions().getCards().map((c) => c.getName())).not.toContain(topCard);
  });

  it('rejects pull to selected when wip is full', () => {
    const session = GameSession.createNew();
    confirm(session);
    confirm(session);

    const limit = session.getBoard().getSelected().getLimit();
    while (session.getBoard().getSelected().getCards().length < limit) {
      const next = session.getBoard().getOptions().getCards()[0]?.getName();
      if (!next) {
        break;
      }
      const pull = session.dispatch({ type: 'pull-to-selected', cardName: next });
      if (!pull.ok) {
        break;
      }
    }

    expect(session.getBoard().getSelected().getCards().length).toBe(limit);
    const blocked = session.getBoard().getOptions().getCards()[0]?.getName();
    if (blocked) {
      const result = session.dispatch({ type: 'pull-to-selected', cardName: blocked });
      expect(result.ok).toBe(false);
    }
  });

  it('rejects illegal actions in wrong phase', () => {
    const session = GameSession.createNew();
    const result = session.dispatch({
      type: 'expedite-card',
      state: State.TEST,
      cardName: 'S3',
    });
    expect(result.ok).toBe(false);
  });

  it('walks through a full day step by step', () => {
    const session = GameSession.createNew();
    confirm(session);
    expect(session.getCurrentDay()).toBe(10);
    expect(session.getPhase()).toBe(GamePhase.ADJUST_WIP);

    walkStandUp(session);
    expect(session.getPhase()).toBe(GamePhase.DO_WORK);

    confirm(session);
    expect(session.getPhase()).toBe(GamePhase.DAY_COMPLETE);
    expect(session.getSnapshots().length).toBe(1);
    expect(session.getSnapshots()[0]!.day).toBe(10);
  });

  it('applies pete blocker on day 10 end of day', () => {
    const session = GameSession.createNew();
    confirm(session);
    walkStandUp(session);
    confirm(session);

    const s10 = session.getBoard().findCardByName('S10');
    expect(s10?.isBlocked()).toBe(true);
  });

  it('rejects ted training outside ted-training phase', () => {
    const session = GameSession.createNew();
    const result = session.dispatch({ type: 'send-ted-to-training', training: true });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Ted training');
  });

  it('serializes and restores session metadata', () => {
    const session = GameSession.createNew();
    session.dispatch({
      type: 'adjust-wip-limits',
      adjustment: new WipLimitAdjustment(11, 0, 2, 2, 4, 3),
    });
    confirm(session);

    const json = session.toJSON();
    const restored = GameSession.fromJSON(json);

    expect(restored.getCurrentDay()).toBe(10);
    expect(restored.getPhase()).toBe(GamePhase.ADJUST_WIP);
    expect(restored.getBoard().getWipAdjustmentCount()).toBe(1);
    expect(restored.getBoard().getOptions().getCards().map((c) => c.getName())).toEqual(
      json.backlogOrder,
    );
  });
});
