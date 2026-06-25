import type { Column } from './Column.js';

export abstract class LimitedColumn implements Column {
  private limitsEnabled = true;

  constructor(private wipLimit: number) {}

  getLimit(): number {
    return this.limitsEnabled ? this.wipLimit : Number.MAX_SAFE_INTEGER;
  }

  setLimit(wipLimit: number): void {
    this.wipLimit = wipLimit;
  }

  disableLimits(): void {
    this.limitsEnabled = false;
  }

  enableLimits(): void {
    this.limitsEnabled = true;
  }

  areLimitsEnabled(): boolean {
    return this.limitsEnabled;
  }

  abstract addCard(card: import('../card/Card.js').Card, cos: import('../ClassOfService.js').ClassOfService): void;
  abstract getCards(): import('../card/Card.js').Card[];
  abstract pull(context: import('../Context.js').Context, cos: import('../ClassOfService.js').ClassOfService): import('../card/Card.js').Card | undefined;
  abstract orderBy(comparator: (a: import('../card/Card.js').Card, b: import('../card/Card.js').Card) => number): void;
  abstract doTheWork(context: import('../Context.js').Context): void;
  abstract clear(): void;
}
