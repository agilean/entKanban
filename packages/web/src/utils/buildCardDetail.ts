import {
  CardSize,
  ExpediteCard,
  FixedDateCard,
  IntangibleCard,
  State,
  type Card,
  type Day,
} from '@kanban-game/engine';
import { getCardCatalogEntry } from './cardCatalog';
import { formatBusinessValue } from './cardValue';
import { computeWipAge } from './wipAge';

export type CardDetailMetric = {
  label: string;
  value: string;
};

export type CardDetail = {
  name: string;
  kind: 'standard' | 'expedite' | 'fixed-date' | 'intangible';
  title: string;
  description: string;
  effect?: string;
  effort: {
    analysis: number;
    development: number;
    test: number;
  };
  metrics: CardDetailMetric[];
};

const SIZE_LABELS: Record<CardSize, string> = {
  [CardSize.VERY_HIGH]: 'Very High',
  [CardSize.HIGH]: 'High',
  [CardSize.MEDIUM]: 'Medium',
  [CardSize.LOW]: 'Low',
  [CardSize.NONE]: 'N/A',
};

function isStoryCard(kind: CardDetail['kind']): boolean {
  return kind === 'standard';
}

function cardKind(card: Card): CardDetail['kind'] {
  if (card instanceof ExpediteCard) {
    return 'expedite';
  }
  if (card instanceof FixedDateCard) {
    return 'fixed-date';
  }
  if (card instanceof IntangibleCard) {
    return 'intangible';
  }
  return 'standard';
}

function kindLabel(kind: CardDetail['kind']): string {
  const labels: Record<CardDetail['kind'], string> = {
    standard: 'Standard',
    expedite: 'Expedite',
    'fixed-date': 'Fixed Date',
    intangible: 'Intangible',
  };
  return labels[kind];
}

function safeMetric(label: string, value: string | number | undefined | null): CardDetailMetric | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return { label, value: String(value) };
}

export function buildCardDetail(card: Card, currentDay: number, day: Day): CardDetail {
  const catalog = getCardCatalogEntry(card.getName());
  const kind = cardKind(card);
  const metrics: CardDetailMetric[] = [];

  const push = (metric: CardDetailMetric | null) => {
    if (metric) {
      metrics.push(metric);
    }
  };

  push(safeMetric('类型', kindLabel(kind)));

  const businessValue = formatBusinessValue(card.getSize());
  if (isStoryCard(kind) && businessValue) {
    push(safeMetric('价值', businessValue));
  } else if (!isStoryCard(kind)) {
    push(safeMetric('规模', SIZE_LABELS[card.getSize()]));
  }

  if (card.getDaySelected() > 0) {
    push(safeMetric('选中于', `Day ${card.getDaySelected()}`));
    const wipAge = computeWipAge(card, currentDay);
    if (wipAge?.kind === 'flow') {
      push(safeMetric('已流动', `${wipAge.days} 天`));
    }
  }
  if (card.getDayDeployed() > 0) {
    push(safeMetric('部署于', `Day ${card.getDayDeployed()}`));
    try {
      push(safeMetric('Cycle Time', `${card.getCycleTime()} 天`));
      push(safeMetric('订阅用户', card.getSubscribers().toLocaleString()));
    } catch {
      // ignore incomplete lifecycle metrics
    }
  }

  const dueDate = card.getDueDate();
  if (dueDate >= 0) {
    push(safeMetric('交付日', `Day ${dueDate}`));
  }

  const fineOrPayment = card.getFineOrPayment();
  if (fineOrPayment !== 0) {
    push(safeMetric(fineOrPayment > 0 ? '奖励' : '罚金', `$${Math.abs(fineOrPayment).toLocaleString()}`));
  }

  if (card.isBlocked() && card.getBlocker()) {
    push(safeMetric('Blocker 剩余', card.getBlocker()!.getRemainingWork()));
  }

  push(safeMetric('可 Expedite', card.isExpeditable(day) ? '是' : '否'));
  push(safeMetric('当前日', `Day ${currentDay}`));

  return {
    name: card.getName(),
    kind,
    title: catalog.title,
    description: catalog.description,
    effect: catalog.effect,
    effort: {
      analysis: card.getRemainingWork(State.ANALYSIS),
      development: card.getRemainingWork(State.DEVELOPMENT),
      test: card.getRemainingWork(State.TEST),
    },
    metrics,
  };
}
