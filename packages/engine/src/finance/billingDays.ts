export const BILLING_DAYS = [9, 12, 15, 18, 21] as const;

export type BillingDay = (typeof BILLING_DAYS)[number];

export function isBillingDay(day: number): boolean {
  return (BILLING_DAYS as readonly number[]).includes(day);
}
