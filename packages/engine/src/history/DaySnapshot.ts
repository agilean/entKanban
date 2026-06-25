export type ColumnWipCounts = {
  backlog: number;
  selected: number;
  analysis: number;
  development: number;
  test: number;
  readyToDeploy: number;
  deployed: number;
};

export type DeployedCardMetrics = {
  name: string;
  cycleTime: number;
  leadTime: number;
};

export type DaySnapshot = {
  day: number;
  wipCounts: ColumnWipCounts;
  deployedToday: DeployedCardMetrics[];
  totalGrossProfit: number;
};
