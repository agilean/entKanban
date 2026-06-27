import { isBillingDay } from './billingDays.js';

/** I1 active: ready column deploys every day. */
export function isDailyReleaseActive(deploymentFrequency: number): boolean {
  return deploymentFrequency === 1;
}

/** Whether the work day should end in the release phase. */
export function shouldEnterReleasePhase(day: number, deploymentFrequency: number): boolean {
  return isBillingDay(day) || isDailyReleaseActive(deploymentFrequency);
}
