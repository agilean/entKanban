export function chainComparator<T>(...comparators: Array<(a: T, b: T) => number>): (a: T, b: T) => number {
  return (a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };
}
