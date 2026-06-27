import type { CardFlowDay } from '../helpers/cardFlowSimulation';

/** getKanban official Day 9/12 deploy scenario — shared by CFD and control chart tests. */
export const OFFICIAL_DEPLOY_FLOW: CardFlowDay[] = [
  {
    day: 9,
    actions: [
      { type: 'advance', fromColumn: 'ready', toColumn: 'deployed', cardName: 'S1' },
      { type: 'advance', fromColumn: 'ready', toColumn: 'deployed', cardName: 'S2' },
    ],
  },
  {
    day: 12,
    actions: [{ type: 'advance', fromColumn: 'ready', toColumn: 'deployed', cardName: 'S4' }],
  },
];

/** All three ready tickets deployed on Day 9 — matches getKanban facilitator walkthrough lead times. */
export const OFFICIAL_DAY9_DEPLOY_FLOW: CardFlowDay[] = [
  {
    day: 9,
    actions: [
      { type: 'advance', fromColumn: 'ready', toColumn: 'deployed', cardName: 'S1' },
      { type: 'advance', fromColumn: 'ready', toColumn: 'deployed', cardName: 'S2' },
      { type: 'advance', fromColumn: 'ready', toColumn: 'deployed', cardName: 'S4' },
    ],
  },
];
