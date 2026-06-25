export class WipLimitAdjustment {
  constructor(
    private readonly day: number,
    private readonly expedite: number,
    private readonly selected: number,
    private readonly analysis: number,
    private readonly development: number,
    private readonly test: number,
  ) {}

  getDay(): number {
    return this.day;
  }

  getExpedite(): number {
    return this.expedite;
  }

  getSelected(): number {
    return this.selected;
  }

  getAnalysis(): number {
    return this.analysis;
  }

  getDevelopment(): number {
    return this.development;
  }

  getTest(): number {
    return this.test;
  }
}
