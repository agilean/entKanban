export type CardEffectKind =
  | 'f1-on-time'
  | 'f1-late-fine'
  | 'i1-continuous-delivery'
  | 'i2-test-boost'
  | 'i3-backlog-cards';

export type CardEffectEvent = {
  cardName: string;
  kind: CardEffectKind;
  day: number;
  message: string;
};
