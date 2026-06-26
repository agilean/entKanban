import { describe, expect, it } from 'vitest';
import { captureBoardSnapshot } from '../src/session/boardSnapshot.js';
import { GamePhase } from '../src/session/GamePhase.js';
import { GameSession } from '../src/session/GameSession.js';
import { State } from '../src/State.js';

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

function boardSignature(session: GameSession): string {
  return JSON.stringify(captureBoardSnapshot(session.getBoard()));
}

describe('GameSession serialization', () => {
  it('round-trips initial day 9 board', () => {
    const session = GameSession.createNew();
    const restored = GameSession.fromJSON(session.toJSON());
    expect(boardSignature(restored)).toBe(boardSignature(session));
    expect(restored.getCurrentDay()).toBe(9);
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
  });

  it('round-trips mid-game board with snapshots', () => {
    const session = GameSession.createNew();
    rollAndAdvanceDay(session);
    rollAndAdvanceDay(session);

    expect(session.getSnapshots().length).toBe(2);

    const restored = GameSession.fromJSON(session.toJSON());
    expect(boardSignature(restored)).toBe(boardSignature(session));
    expect(restored.getCurrentDay()).toBe(session.getCurrentDay());
    expect(restored.getPhase()).toBe(session.getPhase());
    expect(restored.getSnapshots().length).toBe(2);
    expect(restored.getPendingActions()).toEqual(session.getPendingActions());
  });

  it('round-trips backlog order after advancing a day', () => {
    const session = GameSession.createNew();
    rollAndAdvanceDay(session);

    const json = session.toJSON();
    const restored = GameSession.fromJSON(json);

    expect(restored.getCurrentDay()).toBe(10);
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
    expect(restored.getBoard().getOptions().getCards().map((c) => c.getName())).toEqual(
      json.backlogOrder,
    );
    expect(boardSignature(restored)).toBe(boardSignature(session));
  });

  it('round-trips pending roll preview during do-work', () => {
    const session = GameSession.createNew();
    rollDice(session);

    const restored = GameSession.fromJSON(session.toJSON());
    expect(restored.getPhase()).toBe(GamePhase.DO_WORK);
    expect(restored.getPendingRollSteps()).toEqual(session.getPendingRollSteps());
    expect(restored.getPendingActions().some((a) => a.kind === 'dice-roll-preview')).toBe(true);
  });

  it('round-trips manual dice assignments during preparation phase', () => {
    const session = GameSession.createNew();
    expect(session.getPhase()).toBe(GamePhase.REPLENISH);

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
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
    expect(restored.toJSON().manualDiceAssignments).toEqual(assignments);
  });

  it('migrates saved assign-dice phase to preparation on load', () => {
    const session = GameSession.createNew();
    const json = session.toJSON();
    json.phase = GamePhase.ASSIGN_DICE;

    const restored = GameSession.fromJSON(json);
    expect(restored.getPhase()).toBe(GamePhase.REPLENISH);
  });
});
