import type { Board } from '../Board.js';
import { FixedDateCard } from '../card/FixedDateCard.js';

export class FinancialSummary {
  private readonly newSubscribers = new Array<number>(22).fill(0);
  private readonly finesAndPayments = new Array<number>(22).fill(0);

  constructor(board: Board) {
    for (const card of board.getCards()) {
      if (card instanceof FixedDateCard) {
        this.newSubscribers[card.getDueDate()] += card.getSubscribers();
        this.finesAndPayments[card.getDueDate()] += card.getFineOrPayment();
      } else if (card.getDayDeployed() > 0) {
        const billingDay = FinancialSummary.getBillingDay(card.getDayDeployed());
        this.newSubscribers[billingDay] += card.getSubscribers();
      }
    }
  }

  static getBillingDay(dayDeployed: number): number {
    return Math.floor((dayDeployed + 2) / 3) * 3;
  }

  getNewSubscribers(billingCycle: number): number {
    return this.newSubscribers[billingCycle];
  }

  getTotalSubscribersToDate(billingCycle: number): number {
    if (billingCycle === 9) {
      return this.newSubscribers[billingCycle];
    }
    return this.newSubscribers[billingCycle] + this.getTotalSubscribersToDate(billingCycle - 3);
  }

  static getRevenueMultiplier(billingCycle: number): number {
    return 10 + Math.floor((billingCycle - 9) / 3) * 5;
  }

  getBillingCycleRevenue(billingCycle: number): number {
    return this.getTotalSubscribersToDate(billingCycle) * FinancialSummary.getRevenueMultiplier(billingCycle);
  }

  getBillingCycleGrossProfit(billingCycle: number): number {
    return this.getBillingCycleRevenue(billingCycle) + this.getFinesOrPayments(billingCycle);
  }

  getTotalGrossProfitToDate(billingCycle: number): number {
    if (billingCycle === 9) {
      return this.getBillingCycleGrossProfit(billingCycle);
    }
    return this.getTotalGrossProfitToDate(billingCycle - 3) + this.getBillingCycleGrossProfit(billingCycle);
  }

  getFinesOrPayments(billingCycle: number): number {
    return this.finesAndPayments[billingCycle];
  }

  compareTo(other: FinancialSummary): number {
    return this.getTotalGrossProfitToDate(21) - other.getTotalGrossProfitToDate(21);
  }

  toString(): string {
    const lines: string[] = [''];
    const billingDays = [9, 12, 15, 18, 21];

    lines[0] = ''.padEnd(20) + billingDays.map((d) => this.padLeft(`Day ${d}`)).join('');
    lines.push(
      'New Subscribers'.padEnd(20) +
        billingDays.map((d) => this.padLeft(this.getNewSubscribers(d))).join(''),
    );
    lines.push(
      'Total Subscribers'.padEnd(20) +
        billingDays.map((d) => this.padLeft(this.getTotalSubscribersToDate(d))).join(''),
    );
    lines.push(
      'Cycle Revenue'.padEnd(20) +
        billingDays.map((d) => this.padLeft(this.getBillingCycleRevenue(d))).join(''),
    );
    lines.push(
      'Fines or Payments'.padEnd(20) +
        billingDays.map((d) => this.padLeft(this.getFinesOrPayments(d))).join(''),
    );
    lines.push(
      'Cycle Gross Profit'.padEnd(20) +
        billingDays.map((d) => this.padLeft(this.getBillingCycleGrossProfit(d))).join(''),
    );
    lines.push(
      'Gross Profit To Date'.padEnd(20) +
        billingDays.map((d) => this.padLeft(this.getTotalGrossProfitToDate(d))).join(''),
    );

    return lines.join('\n');
  }

  private padLeft(value: string | number): string {
    return String(value).padStart(8);
  }
}
