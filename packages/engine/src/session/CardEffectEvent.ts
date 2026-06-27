export type CardEffectKind =
  | 'f1-on-time'
  | 'f1-late-fine'
  | 'f2-on-time'
  | 'f2-late-no-reward'
  | 'i1-continuous-delivery'
  | 'i1-deployed'
  | 'i2-test-boost'
  | 'i2-deployed'
  | 'i3-backlog-cards';

export type CardEffectEvent = {
  cardName: string;
  kind: CardEffectKind;
  day: number;
  message: string;
};
