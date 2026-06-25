import type { SubscriberProfile } from './SubscriberProfile.js';

export class VariableSubscriberProfile implements SubscriberProfile {
  private readonly subscribers: number[];

  constructor(subscribers: number[]) {
    if (subscribers.length !== 15) {
      throw new Error(`Expected 15 values, got ${subscribers.length}`);
    }
    this.subscribers = subscribers;
  }

  getSubscribers(cycleTime: number): number {
    const index = Math.min(cycleTime, 15) - 1;
    if (index < 0) {
      throw new Error(`No subscribers for cycle time ${cycleTime}`);
    }
    return this.subscribers[index]!;
  }
}
