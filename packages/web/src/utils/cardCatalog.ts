export type CardCatalogEntry = {
  title: string;
  description: string;
  effect?: string;
};

const ENTRIES: Record<string, CardCatalogEntry> = {
  E1: {
    title: 'BigCorp Expedite',
    description: '大客户紧急需求，Expedite 通道，有固定交付日与罚金。',
  },
  E2: {
    title: 'Graduate Glen Expedite',
    description: '毕业生 Glen 相关紧急事项，可 Expedite。',
  },
  I1: {
    title: 'Infrastructure',
    description: '无形价值卡：基础设施改进，不计入财务订阅但优先流动。',
    effect: '部署后，就绪列每天均可部署（部署频率变为 1）。',
  },
  I2: {
    title: 'Technical Debt',
    description: '无形价值卡：偿还技术债，提升长期交付能力。',
    effect: '进入就绪列后，测试列中所有未完成卡自动减少 2 点测试工作量；此后新进入测试列的卡也会自动减 2。',
  },
  I3: {
    title: 'Process Improvement',
    description: '无形价值卡：流程改进，优先于标准功能被拉入优先列。',
    effect: '部署后，向存量加入 S29–S33 五张新功能卡。',
  },
  F1: {
    title: 'Fixed Date Feature',
    description: '固定交付日功能，逾期有罚金。',
  },
  F2: {
    title: 'Fixed Date Feature',
    description: '固定交付日功能，按期交付有奖励。',
  },
  S10: {
    title: 'Blocked Development Item',
    description: '开发中的标准功能，可能触发 Blocker 掷骰消除。',
  },
};

export function getCardCatalogEntry(name: string): CardCatalogEntry {
  return (
    ENTRIES[name] ?? {
      title: `Feature ${name}`,
      description: '标准功能卡片，完成 Analysis / Development / Test 后部署并产生订阅收入。',
    }
  );
}
