import { describe, expect, it } from 'vitest';
import { GamePhase } from '../src/session/GamePhase.js';
import { GameSession } from '../src/session/GameSession.js';
import { State } from '../src/State.js';
import { WipLimitAdjustment } from '../src/WipLimitAdjustment.js';

function rollDice(session: GameSession): void {
  const result = session.dispatch({ type: 'roll-dice' });
  expect(result.ok).toBe(true);
}

function applyAllRolls(session: GameSession): void {
  const steps = session.getPendingRollSteps();
  for (let index = 0; index < steps.length; index += 1) {
    const result = session.dispatch({ type: 'apply-roll-step', index });
    expect(result.ok).toBe(true);
  }
}

function rollAndAdvanceDay(session: GameSession): void {
  rollDice(session);
  applyAllRolls(session);
  if (session.getPhase() === GamePhase.RELEASE) {
    const confirm = session.dispatch({ type: 'confirm-phase' });
    expect(confirm.ok).toBe(true);
  }
}

describe('GameSession', () => {
  it('starts at day 9 replenish with initial board', () => {
    const session = GameSession.createNew();
    expect(session.getCurrentDay()).toBe(9);
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);
    expect(session.getBoard().getDeployed().getCards().length).toBe(0);
    expect(session.getBoard().getReadyToDeploy().getCards().map((c) => c.getName())).toEqual([
      'S1',
      'S2',
      'S4',
    ]);
    const confirmAction = session.getPendingActions().find((a) => a.kind === 'confirm');
    expect(confirmAction).toBeDefined();
    expect(confirmAction && 'label' in confirmAction ? confirmAction.label : null).toBe('do-work');
  });

  it('rejects wip adjustment', () => {
    const session = GameSession.createNew();
    const adjustment = new WipLimitAdjustment(11, 0, 2, 2, 4, 3);
    const result = session.dispatch({ type: 'adjust-wip-limits', adjustment });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/WIP/);
  });

  it('reorders backlog during replenish', () => {
    const session = GameSession.createNew();
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);
    const original = session.getBoard().getOptions().getCards().map((c) => c.getName());
    const reversed = [...original].reverse();
    const result = session.dispatch({ type: 'reorder-backlog', cardNames: reversed });
    expect(result.ok).toBe(true);
    expect(session.getBoard().getOptions().getCards().map((c) => c.getName())).toEqual(reversed);
  });

  it('pulls a backlog card into selected during replenish', () => {
    const session = GameSession.createNew();

    const topCard = session.getBoard().getOptions().getCards()[0]!.getName();
    const result = session.dispatch({ type: 'pull-to-selected', cardName: topCard });
    expect(result.ok).toBe(true);
    expect(session.getBoard().getSelected().getCards().map((c) => c.getName())).toContain(topCard);
    expect(session.getBoard().getOptions().getCards().map((c) => c.getName())).not.toContain(topCard);
  });

  it('reorders selected during replenish', () => {
    const session = GameSession.createNew();

    while (session.getBoard().getSelected().getCards().length < 2) {
      const next = session.getBoard().getOptions().getCards()[0]?.getName();
      if (!next) {
        break;
      }
      session.dispatch({ type: 'pull-to-selected', cardName: next });
    }

    const original = session.getBoard().getSelected().getCards().map((c) => c.getName());
    if (original.length < 2) {
      return;
    }
    const reversed = [...original].reverse();
    const result = session.dispatch({ type: 'reorder-selected', cardNames: reversed });
    expect(result.ok).toBe(true);
    expect(session.getBoard().getSelected().getCards().map((c) => c.getName())).toEqual(reversed);
  });

  it('rejects pull to selected when wip is full', () => {
    const session = GameSession.createNew();

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

  it('advances a done development card to test during replenish', () => {
    const session = GameSession.createNew();
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);
    const result = session.dispatch({
      type: 'advance-card',
      fromColumn: 'development',
      toColumn: 'test',
      cardName: 'S5',
    });
    expect(result.ok).toBe(true);
    expect(
      session.getBoard().getStateColumn(State.DEVELOPMENT).getCards().some((c) => c.getName() === 'S5'),
    ).toBe(false);
    expect(
      session.getBoard().getStateColumn(State.TEST).getCards().some((c) => c.getName() === 'S5'),
    ).toBe(true);
  });

  it('rejects illegal actions in wrong phase', () => {
    const session = GameSession.createNew();
    rollDice(session);

    const result = session.dispatch({
      type: 'expedite-card',
      state: State.TEST,
      cardName: 'S3',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects expedite', () => {
    const session = GameSession.createNew();
    const result = session.dispatch({
      type: 'expedite-card',
      state: State.ANALYSIS,
      cardName: 'S8',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/加速/);
  });

  it('allows dice assignment during preparation', () => {
    const session = GameSession.createNew();
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);

    const cardName = session.getBoard().getStateColumn(State.DEVELOPMENT).getIncompleteCards()[0]!.getName();
    const assign = session.dispatch({
      type: 'assign-dice',
      assignments: [{ state: State.DEVELOPMENT, cardName, diceIndices: [2] }],
    });
    expect(assign.ok).toBe(true);
  });

  it('enters release phase on billing days after dice work', () => {
    const session = GameSession.createNew();
    rollDice(session);
    applyAllRolls(session);
    expect(session.getPhase()).toBe(GamePhase.RELEASE);
    expect(session.getPendingActions().some((a) => a.kind === 'billing-summary')).toBe(true);
  });

  it('rejects deploy during replenish on billing day', () => {
    const session = GameSession.createNew();
    const result = session.dispatch({
      type: 'advance-card',
      fromColumn: 'ready',
      toColumn: 'deployed',
      cardName: 'S7',
    });
    expect(result.ok).toBe(false);
  });

  it('auto-deploys ready cards when finishing release phase', () => {
    const session = GameSession.createNew();
    rollDice(session);
    applyAllRolls(session);
    expect(session.getPhase()).toBe(GamePhase.RELEASE);
    expect(session.getBoard().getReadyToDeploy().getCards().map((c) => c.getName())).toEqual([
      'S1',
      'S2',
      'S4',
    ]);

    const confirm = session.dispatch({ type: 'confirm-phase' });
    expect(confirm.ok).toBe(true);
    expect(session.getBoard().getDeployed().getCards().map((c) => c.getName())).toEqual([
      'S1',
      'S2',
      'S4',
    ]);
    expect(session.getBoard().getReadyToDeploy().getCards()).toEqual([]);
  });

  it('rolls dice using column dice and auto-advances to next day replenish', () => {
    const session = GameSession.createNew();
    expect(session.getCurrentDay()).toBe(9);
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);

    rollAndAdvanceDay(session);
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);
    expect(session.getCurrentDay()).toBe(10);
    expect(session.getSnapshots().length).toBe(1);
    expect(session.getSnapshots()[0]!.day).toBe(9);
  });

  it('starts each new day at replenish after roll', () => {
    const session = GameSession.createNew();
    rollAndAdvanceDay(session);
    rollAndAdvanceDay(session);

    expect(session.getCurrentDay()).toBe(11);
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);
  });

  it('rejects ted training outside ted-training phase', () => {
    const session = GameSession.createNew();
    const result = session.dispatch({ type: 'send-ted-to-training', training: true });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Ted training');
  });

  it('serializes and restores session metadata', () => {
    const session = GameSession.createNew();
    rollAndAdvanceDay(session);

    const json = session.toJSON();
    const restored = GameSession.fromJSON(json);

    expect(restored.getCurrentDay()).toBe(10);
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
    expect(restored.getBoard().getOptions().getCards().map((c) => c.getName())).toEqual(
      json.backlogOrder,
    );
  });

  it('migrates saved adjust-wip phase to replenish on load', () => {
    const session = GameSession.createNew();
    const json = session.toJSON();
    json.phase = GamePhase.ADJUST_WIP;

    const restored = GameSession.fromJSON(json);
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
  });

  it('migrates saved setup phase to replenish on load', () => {
    const session = GameSession.createNew();
    const json = session.toJSON();
    json.phase = GamePhase.SETUP;

    const restored = GameSession.fromJSON(json);
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
  });

  it('exposes dice roll preview after rolling', () => {
    const session = GameSession.createNew();
    rollDice(session);
    expect(session.getPhase()).toBe(GamePhase.DO_WORK);
    expect(session.getPendingRollSteps().length).toBeGreaterThan(0);
    expect(session.getPendingActions().some((a) => a.kind === 'dice-roll-preview')).toBe(true);
  });
});
