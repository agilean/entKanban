import { State } from '../State.js';
import type { Board } from '../Board.js';
import type { Context } from '../Context.js';
import { FixedDateCard } from '../card/FixedDateCard.js';
import type { Card } from '../card/Card.js';
import type { CardEffectEvent, CardEffectKind } from './CardEffectEvent.js';

const EFFECT_KIND_PRIORITY: Record<CardEffectKind, number> = {
  'i1-deployed': 20,
  'i1-continuous-delivery': 10,
  'i2-deployed': 20,
  'i2-test-boost': 10,
  'i3-backlog-cards': 20,
  'f1-on-time': 20,
  'f1-late-fine': 20,
  'f2-on-time': 20,
  'f2-late-no-reward': 20,
};

/** One display line per card — prefer deploy/最终状态 over 生效提示. */
export function consolidateReleaseEffectEvents(
  events: readonly CardEffectEvent[],
): CardEffectEvent[] {
  const byCard = new Map<string, CardEffectEvent>();
  for (const event of events) {
    const existing = byCard.get(event.cardName);
    if (!existing) {
      byCard.set(event.cardName, event);
      continue;
    }
    const existingPriority = EFFECT_KIND_PRIORITY[existing.kind] ?? 0;
    const nextPriority = EFFECT_KIND_PRIORITY[event.kind] ?? 0;
    if (nextPriority >= existingPriority) {
      byCard.set(event.cardName, event);
    }
  }
  return [...byCard.values()].sort((a, b) => a.cardName.localeCompare(b.cardName));
}

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

  if (card instanceof FixedDateCard && card.getName() === 'F2') {
    const fineOrPayment = card.getFineOrPayment();
    if (fineOrPayment > 0) {
      context.recordEffect({
        cardName: 'F2',
        kind: 'f2-on-time',
        day,
        message: 'F2 已按期交付（Day 21 前），奖励 +$500',
      });
    } else {
      context.recordEffect({
        cardName: 'F2',
        kind: 'f2-late-no-reward',
        day,
        message: 'F2 逾期交付，无 $500 奖励',
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

  if (card.getName() === 'I1') {
    context.recordEffect({
      cardName: 'I1',
      kind: 'i1-deployed',
      day,
      message: 'I1 已部署：就绪列改为每日均可发布（持续生效）',
    });
  }

  if (card.getName() === 'I2') {
    context.recordEffect({
      cardName: 'I2',
      kind: 'i2-deployed',
      day,
      message: 'I2 已部署：测试列所有卡测试工作量 -2（持续生效）',
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
