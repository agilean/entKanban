import { State } from '../State.js';
import type { Board } from '../Board.js';
import type { Context } from '../Context.js';
import { FixedDateCard } from '../card/FixedDateCard.js';
import type { Card } from '../card/Card.js';
import type { CardEffectEvent } from './CardEffectEvent.js';

export function recordReadyEffects(context: Context, card: Card): void {
  const day = context.getDay().getOrdinal();

  if (card.getName() === 'I1') {
    context.recordEffect({
      cardName: 'I1',
      kind: 'i1-continuous-delivery',
      day,
      message: 'I1 已生效：就绪列改为每日发布',
    });
  }
}

export function recordDeployEffects(context: Context, card: Card): void {
  const day = context.getDay().getOrdinal();

  if (card instanceof FixedDateCard && card.getName() === 'F1') {
    const fineOrPayment = card.getFineOrPayment();
    if (fineOrPayment < 0) {
      context.recordEffect({
        cardName: 'F1',
        kind: 'f1-late-fine',
        day,
        message: 'F1 逾期交付，Day 15 罚金 -$1,500',
      });
    } else {
      context.recordEffect({
        cardName: 'F1',
        kind: 'f1-on-time',
        day,
        message: 'F1 已按期交付，免 $1,500 罚金',
      });
    }
  }

  if (card.getName() === 'I3') {
    context.recordEffect({
      cardName: 'I3',
      kind: 'i3-backlog-cards',
      day,
      message: 'I3 已生效：存量加入 S29–S33 五张新功能卡',
    });
  }
}

export function replaySpecialCardEffects(board: Board): void {
  const readyNames = board.getReadyToDeploy().getCards().map((card) => card.getName());
  const deployedNames = board.getDeployed().getCards().map((card) => card.getName());
  const isActive = (name: string) => readyNames.includes(name) || deployedNames.includes(name);

  if (isActive('I1') || board.getReadyToDeploy().getDeploymentFrequency() === 1) {
    board.getReadyToDeploy().setDeploymentFrequency(1);
  }

  if (isActive('I2')) {
    board.getStateColumn(State.TEST).restoreI2TestBoost();
  }
}

export function mergeEffectEvents(...groups: readonly CardEffectEvent[][]): CardEffectEvent[] {
  const seen = new Set<string>();
  const merged: CardEffectEvent[] = [];
  for (const group of groups) {
    for (const event of group) {
      const key = `${event.cardName}:${event.kind}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(event);
    }
  }
  return merged;
}
