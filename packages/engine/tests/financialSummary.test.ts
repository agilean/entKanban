import { describe, expect, it } from 'vitest';
import { Board } from '../src/Board.js';
import { ClassOfService } from '../src/ClassOfService.js';
import { Context } from '../src/Context.js';
import { Day } from '../src/Day.js';
import { DaysFactory } from '../src/DaysFactory.js';
import { getCard } from '../src/card/Cards.js';
import { DeployedColumn } from '../src/column/DeployedColumn.js';
import { FinancialSummary } from '../src/finance/FinancialSummary.js';

function makeBoard(): Board {
  return new Board();
}

describe('FinancialSummary', () => {
  it('counts new subscribers this billing cycle', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.getNewSubscribers(9)).toBe(20);
    expect(summary.getNewSubscribers(12)).toBe(0);
    expect(summary.getNewSubscribers(15)).toBe(0);
    expect(summary.getNewSubscribers(18)).toBe(0);
    expect(summary.getNewSubscribers(21)).toBe(0);
  });

  it('counts total subscribers to date', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.getTotalSubscribersToDate(9)).toBe(20);
    expect(summary.getTotalSubscribersToDate(12)).toBe(20);
    expect(summary.getTotalSubscribersToDate(15)).toBe(20);
    expect(summary.getTotalSubscribersToDate(18)).toBe(20);
    expect(summary.getTotalSubscribersToDate(21)).toBe(20);
  });

  it('counts fines and payments', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.getFinesOrPayments(15)).toBe(-1500);
    expect(summary.getFinesOrPayments(18)).toBe(0);
  });

  it('does not change F1 fine when delivered on time', () => {
    const f1 = getCard('F1');
    f1.onSelected(new Context(new Board(), new DaysFactory(true).getDay(10)));
    f1.onDeployed(new Context(new Board(), new DaysFactory(true).getDay(15)));

    const board = new Board();
    board.getDeployed().addCard(f1, ClassOfService.STANDARD);

    const summary = new FinancialSummary(board);
    expect(summary.getFinesOrPayments(15)).toBe(-1500);
  });

  it('fines F1 when late', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.getFinesOrPayments(15)).toBe(-1500);
  });

  it('does not pay E1 when late', () => {
    const e1 = getCard('E1');
    e1.onSelected(new Context(new Board(), new DaysFactory(true).getDay(15)));
    e1.onDeployed(new Context(new Board(), new DaysFactory(true).getDay(19)));

    const board = new Board();
    board.getDeployed().addCard(e1, ClassOfService.STANDARD);

    const summary = new FinancialSummary(board);
    expect(summary.getFinesOrPayments(18)).toBe(0);
  });

  it('calculates billing cycle revenue', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.getBillingCycleRevenue(9)).toBe(200);
    expect(summary.getBillingCycleRevenue(12)).toBe(300);
    expect(summary.getBillingCycleRevenue(15)).toBe(400);
    expect(summary.getBillingCycleRevenue(18)).toBe(500);
    expect(summary.getBillingCycleRevenue(21)).toBe(600);
  });

  it('calculates billing cycle gross profit', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.getBillingCycleGrossProfit(9)).toBe(200);
    expect(summary.getBillingCycleGrossProfit(12)).toBe(300);
    expect(summary.getBillingCycleGrossProfit(15)).toBe(-1100);
    expect(summary.getBillingCycleGrossProfit(18)).toBe(500);
    expect(summary.getBillingCycleGrossProfit(21)).toBe(600);
  });

  it('calculates gross profit to date', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.getTotalGrossProfitToDate(9)).toBe(200);
    expect(summary.getTotalGrossProfitToDate(12)).toBe(500);
    expect(summary.getTotalGrossProfitToDate(15)).toBe(-600);
    expect(summary.getTotalGrossProfitToDate(18)).toBe(-100);
    expect(summary.getTotalGrossProfitToDate(21)).toBe(500);
  });

  it('formats a summary table', () => {
    const summary = new FinancialSummary(makeBoard());
    expect(summary.toString()).toContain('New Subscribers');
    expect(summary.toString()).toContain('Day 21');
  });
});
