import { describe, expect, it } from 'vitest';
import { captureBoardSnapshot } from '../src/session/boardSnapshot.js';
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

function boardSignature(session: GameSession): string {
  return JSON.stringify(captureBoardSnapshot(session.getBoard()));
}

describe('GameSession serialization', () => {
  it('round-trips initial day 9 board', () => {
    const session = GameSession.createNew();
    const restored = GameSession.fromJSON(session.toJSON());
    expect(boardSignature(restored)).toBe(boardSignature(session));
    expect(restored.getCurrentDay()).toBe(9);
    expect(restored.getPhase()).toBe(GamePhase.SETUP);
  });

  it('round-trips mid-game board with blocker and snapshots', () => {
    const session = GameSession.createNew();
    confirm(session);
    walkStandUp(session);
    confirm(session);

    expect(session.getBoard().findCardByName('S10')?.isBlocked()).toBe(true);
    expect(session.getSnapshots().length).toBe(1);

    const restored = GameSession.fromJSON(session.toJSON());
    expect(boardSignature(restored)).toBe(boardSignature(session));
    expect(restored.getCurrentDay()).toBe(session.getCurrentDay());
    expect(restored.getPhase()).toBe(session.getPhase());
    expect(restored.getSnapshots().length).toBe(1);
    expect(restored.getBoard().findCardByName('S10')?.isBlocked()).toBe(true);
    expect(restored.getPendingActions()).toEqual(session.getPendingActions());
  });

  it('round-trips wip adjustments and backlog order', () => {
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
    expect(boardSignature(restored)).toBe(boardSignature(session));
  });

  it('round-trips replenish phase blocker rolls when present', () => {
    const session = GameSession.createNew();
    const json = session.toJSON();
    json.blockerRolls = [{ cardName: 'S6', roll: 4, delta: 4 }];
    json.phase = GamePhase.REPLENISH;
    json.currentDay = 11;

    const restored = GameSession.fromJSON(json);
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
    expect(restored.getPendingActions().some((a) => a.kind === 'blocker-rolls')).toBe(true);
  });

  it('round-trips manual dice assignments during assign-dice phase', () => {
    const session = GameSession.createNew();
    confirm(session);
    confirm(session);
    confirm(session);
    confirm(session);

    expect(session.getPhase()).toBe(GamePhase.ASSIGN_DICE);

    const analysisCard = session
      .getBoard()
      .getStateColumn(State.ANALYSIS)
      .getIncompleteCards()[0]!
      .getName();
    const developmentCard = session
      .getBoard()
      .getStateColumn(State.DEVELOPMENT)
      .getIncompleteCards()[0]!
      .getName();
    const assignments = [
      { state: State.ANALYSIS, cardName: analysisCard, diceIndices: [0, 1] },
      { state: State.DEVELOPMENT, cardName: developmentCard, diceIndices: [2] },
    ];
    expect(session.dispatch({ type: 'assign-dice', assignments }).ok).toBe(true);

    const restored = GameSession.fromJSON(session.toJSON());
    expect(restored.getPhase()).toBe(GamePhase.ASSIGN_DICE);
    expect(restored.toJSON().manualDiceAssignments).toEqual(assignments);
  });
});
