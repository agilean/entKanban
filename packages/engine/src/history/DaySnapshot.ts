export type ColumnWipCounts = {
  backlog: number;
  selected: number;
  analysis: number;
  development: number;
  test: number;
  readyToDeploy: number;
  deployed: number;
};

export type DaySnapshot = {
  day: number;
  wipCounts: ColumnWipCounts;
  deployedCardNames: string[];
  totalGrossProfit: number;
};
