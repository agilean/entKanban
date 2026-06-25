export class Day {
  constructor(private readonly ordinal: number) {}

  getOrdinal(): number {
    return this.ordinal;
  }

  toString(): string {
    return `Day ${this.ordinal}`;
  }
}
