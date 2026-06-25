import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from '../src/index';

describe('engine', () => {
  it('exports version', () => {
    expect(ENGINE_VERSION).toBe('0.0.0');
  });
});
