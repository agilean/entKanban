import { State } from '@kanban-game/engine';
import { describe, expect, it } from 'vitest';
import { isCrossRoleAssignment } from '../src/utils/diceCrossRole';

describe('isCrossRoleAssignment', () => {
  it('returns false when die matches work column', () => {
    expect(isCrossRoleAssignment(State.ANALYSIS, State.ANALYSIS)).toBe(false);
    expect(isCrossRoleAssignment(State.DEVELOPMENT, State.DEVELOPMENT)).toBe(false);
  });

  it('returns true when die is assigned to another column', () => {
    expect(isCrossRoleAssignment(State.ANALYSIS, State.DEVELOPMENT)).toBe(true);
    expect(isCrossRoleAssignment(State.TEST, State.ANALYSIS)).toBe(true);
  });
});
