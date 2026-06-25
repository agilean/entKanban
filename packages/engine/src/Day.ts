import type { Board } from './Board.js';
import { Context } from './Context.js';
import { State } from './State.js';
import { RandomDice } from './dice/RandomDice.js';
import type { Instruction } from './instructions/Instruction.js';
import type { DiceAssignmentStrategy } from './policies/DiceAssignmentStrategy.js';
import { ComplexDiceAssignmentStrategy } from './policies/ComplexDiceAssignmentStrategy.js';

export class Day {
  constructor(
    private readonly ordinal: number,
    private readonly diceAssignmentStrategy: DiceAssignmentStrategy = new ComplexDiceAssignmentStrategy(),
    private readonly instructions: Instruction[] = [],
  ) {}

  getOrdinal(): number {
    return this.ordinal;
  }

  standUp(board: Board): void {
    this.adjustWipLimits(board);
    this.removeBlockers(board);
    this.replenishSelected(board);
    this.expediteTickets(board);
    this.assignDice(board);
  }

  doTheWork(context: Context): void {
    context.getBoard().getDeployed().doTheWork(context);
  }

  endOfDay(board: Board): void {
    for (const instruction of this.instructions) {
      instruction.execute(board);
    }
    board.getStateColumn(State.TEST).assignDice();
    board.getStateColumn(State.DEVELOPMENT).assignDice();
    board.getStateColumn(State.ANALYSIS).assignDice();
  }

  private adjustWipLimits(board: Board): void {
    board.adjustLimits(this.ordinal);
  }

  private expediteTickets(board: Board): void {
    board.getStateColumn(State.ANALYSIS).expediteTickets(this);
    board.getStateColumn(State.DEVELOPMENT).expediteTickets(this);
    board.getStateColumn(State.TEST).expediteTickets(this);
  }

  private removeBlockers(board: Board): void {
    for (const card of board.getStateColumn(State.DEVELOPMENT).getIncompleteCards()) {
      if (!card.isBlocked() || !card.getBlocker()) {
        continue;
      }
      const roll = new RandomDice().roll();
      const delta = Math.min(roll, card.getBlocker()!.getRemainingWork());
      card.getBlocker()!.doWork(delta);
    }
  }

  private replenishSelected(board: Board): void {
    const context = new Context(board, this);
    board.getStateColumn(State.ANALYSIS).doTheWork(context);
    board.getSelected().doTheWork(context);
    board.getReadyToDeploy().doTheWork(context);
    board.getSelected().doTheWork(context);
  }

  private assignDice(board: Board): void {
    this.diceAssignmentStrategy.assignDice(board);
  }

  toString(): string {
    return `D${this.ordinal}`;
  }
}
