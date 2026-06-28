import { describe, expect, it } from 'vitest';
import { MOBILE_MEDIA_QUERY } from '../../src/composables/useIsMobile';
import { columnLabel, nextColumnLabel } from '../../src/utils/columnLabels';

describe('useIsMobile', () => {
  it('uses 768px breakpoint media query', () => {
    expect(MOBILE_MEDIA_QUERY).toBe('(max-width: 768px)');
  });
});

describe('columnLabels', () => {
  it('maps flow columns to Chinese labels', () => {
    expect(columnLabel('backlog')).toBe('存量');
    expect(columnLabel('analysis')).toBe('分析');
    expect(nextColumnLabel('selected')).toBe('分析');
  });
});

/**
 * Manual mobile QA checklist (iOS Safari / Android Chrome):
 * - Day 9 replenish: tap backlog card -> pull to selected
 * - Tap card in analysis -> advance to development
 * - Tap dice -> tap card to assign
 * - Roll dice via DayPhaseBar button (>=44px touch target)
 * - Release phase: open 发布面板 bottom sheet
 * - Bottom bar: save/load/new game/more menus
 * - Horizontal scroll kanban columns with snap
 */
