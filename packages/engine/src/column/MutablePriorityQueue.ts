export class MutablePriorityQueue<T> {
  private items: T[] = [];

  constructor(private comparator: (a: T, b: T) => number) {}

  setComparator(comparator: (a: T, b: T) => number): void {
    this.comparator = comparator;
    this.items.sort(this.comparator);
  }

  getComparator(): (a: T, b: T) => number {
    return this.comparator;
  }

  add(item: T): void {
    this.items.push(item);
    this.items.sort(this.comparator);
  }

  poll(): T | undefined {
    return this.items.shift();
  }

  contains(item: T): boolean {
    return this.items.includes(item);
  }

  remove(item: T): boolean {
    const index = this.items.indexOf(item);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }

  removeIf(predicate: (item: T) => boolean): void {
    this.items = this.items.filter((item) => !predicate(item));
  }

  clear(): void {
    this.items = [];
  }

  get size(): number {
    return this.items.length;
  }

  stream(): T[] {
    return [...this.items].sort(this.comparator);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.stream()[Symbol.iterator]();
  }
}
