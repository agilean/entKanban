import type { Day } from './Day.js';

let currentDay: Day | undefined;

export const DayStore = {
  getDay(): Day | undefined {
    return currentDay;
  },

  setDay(day: Day): void {
    currentDay = day;
  },

  clear(): void {
    currentDay = undefined;
  },
};
