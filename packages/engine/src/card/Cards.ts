import { CardSize } from './Card.js';
import { StandardCard } from './StandardCard.js';
import { ExpediteCard } from './ExpediteCard.js';
import { IntangibleCard } from './IntangibleCard.js';
import { FixedDateCard } from './FixedDateCard.js';
import { VariableSubscriberProfile } from '../profile/VariableSubscriberProfile.js';
import type { Card } from './Card.js';

export function getCard(name: string): Card {
  switch (name) {
    case 'S1': return new StandardCard('S1', CardSize.LOW, 0, 0, 0, new VariableSubscriberProfile([9, 9, 7, 7, 7, 6, 5, 5, 5, 3, 0, -2, -4, -4, -5]), 1, 0);
    case 'S2': return new StandardCard('S2', CardSize.LOW, 0, 0, 0, new VariableSubscriberProfile([10, 9, 7, 7, 5, 4, 4, 4, 4, 3, 3, 2, 2, 1, 0]), 1, 0);
    case 'S3': return new StandardCard('S3', CardSize.MEDIUM, 0, 0, 6, new VariableSubscriberProfile([14, 14, 14, 14, 13, 13, 12, 10, 8, 8, 8, 5, 4, 2, 1]), 2);
    case 'S4': return new StandardCard('S4', CardSize.HIGH, 0, 0, 0, new VariableSubscriberProfile([16, 14, 14, 13, 11, 11, 11, 11, 11, 11, 11, 10, 9, 8, 7]), 3, 0);
    case 'S5': return new StandardCard('S5', CardSize.MEDIUM, 0, 0, 9, new VariableSubscriberProfile([13, 13, 12, 12, 12, 11, 11, 8, 8, 8, 6, 6, 6, 6, 4]), 3);
    case 'S6': return new StandardCard('S6', CardSize.HIGH, 0, 2, 8, new VariableSubscriberProfile([17, 16, 16, 16, 16, 16, 14, 14, 14, 13, 13, 13, 12, 12, 9]), 4);
    case 'S7': return new StandardCard('S7', CardSize.HIGH, 0, 5, 8, new VariableSubscriberProfile([16, 16, 16, 14, 13, 12, 11, 11, 10, 9, 7, 7, 7, 6, 5]), 5);
    case 'S8': return new StandardCard('S8', CardSize.MEDIUM, 1, 8, 9, new VariableSubscriberProfile([12, 11, 11, 10, 9, 9, 7, 6, 5, 4, 4, 4, 1, 1, -2]), 6);
    case 'S9': return new StandardCard('S9', CardSize.MEDIUM, 0, 4, 7, new VariableSubscriberProfile([13, 10, 10, 8, 6, 6, 6, 4, 4, 4, 4, 2, 1, 0, -1]), 6);
    case 'S10': return new StandardCard('S10', CardSize.HIGH, 1, 6, 9, new VariableSubscriberProfile([17, 16, 15, 15, 14, 14, 14, 14, 14, 14, 11, 11, 10, 7, 4]), 9);
    case 'S11': return new StandardCard('S11', CardSize.MEDIUM, 3, 4, 9, new VariableSubscriberProfile([13, 13, 11, 11, 11, 11, 10, 10, 10, 10, 10, 8, 8, 5, 4]));
    case 'S12': return new StandardCard('S12', CardSize.HIGH, 5, 6, 10, new VariableSubscriberProfile([18, 16, 15, 15, 15, 14, 11, 10, 10, 9, 7, 6, 6, 6, 4]));
    case 'S13': return new StandardCard('S13', CardSize.HIGH, 3, 3, 8, new VariableSubscriberProfile([16, 16, 14, 13, 12, 11, 11, 10, 8, 8, 5, 4, 4, 3, 1]), 9);
    case 'S14': return new StandardCard('S14', CardSize.HIGH, 3, 4, 9, new VariableSubscriberProfile([14, 13, 13, 11, 10, 10, 7, 7, 7, 7, 5, 5, 4, 3, 2]));
    case 'S15': return new StandardCard('S15', CardSize.MEDIUM, 3, 3, 9, new VariableSubscriberProfile([13, 12, 11, 11, 11, 11, 11, 9, 8, 6, 6, 4, 3, 2, 1]));
    case 'S16': return new StandardCard('S16', CardSize.MEDIUM, 2, 5, 5, new VariableSubscriberProfile([11, 11, 10, 10, 10, 9, 9, 8, 8, 6, 6, 4, 3, 2, -1]));
    case 'S17': return new StandardCard('S17', CardSize.MEDIUM, 5, 8, 6, new VariableSubscriberProfile([12, 11, 10, 10, 10, 10, 9, 8, 8, 6, 6, 4, 3, 3, -1]));
    case 'S18': return new StandardCard('S18', CardSize.HIGH, 6, 7, 5, new VariableSubscriberProfile([16, 16, 14, 14, 14, 13, 11, 11, 11, 10, 8, 8, 7, 7, 5]));
    case 'S19': return new StandardCard('S19', CardSize.MEDIUM, 5, 7, 2, new VariableSubscriberProfile([13, 11, 8, 8, 8, 7, 7, 6, 6, 6, 5, 3, 1, 0, -4]));
    case 'S20': return new StandardCard('S20', CardSize.LOW, 4, 4, 4, new VariableSubscriberProfile([10, 10, 7, 7, 6, 5, 5, 5, 4, 4, 3, 3, 3, 3, 1]));
    case 'S21': return new StandardCard('S21', CardSize.HIGH, 5, 5, 7, new VariableSubscriberProfile([18, 15, 15, 15, 15, 15, 14, 14, 12, 12, 12, 12, 11, 11, 8]));
    case 'S22': return new StandardCard('S22', CardSize.HIGH, 8, 4, 5, new VariableSubscriberProfile([17, 16, 16, 15, 15, 15, 14, 12, 12, 11, 11, 10, 10, 8, 7]));
    case 'S23': return new StandardCard('S23', CardSize.LOW, 3, 7, 4, new VariableSubscriberProfile([10, 10, 10, 10, 8, 7, 7, 7, 5, 3, 2, 2, 2, 2, 1]));
    case 'S24': return new StandardCard('S24', CardSize.HIGH, 4, 7, 4, new VariableSubscriberProfile([16, 16, 15, 14, 14, 13, 11, 10, 10, 10, 8, 8, 7, 7, 6]));
    case 'S25': return new StandardCard('S25', CardSize.MEDIUM, 4, 7, 7, new VariableSubscriberProfile([12, 11, 10, 10, 10, 10, 9, 8, 7, 6, 6, 4, 3, 3, 1]));
    case 'S26': return new StandardCard('S26', CardSize.MEDIUM, 5, 7, 4, new VariableSubscriberProfile([11, 11, 11, 10, 9, 9, 7, 6, 5, 4, 4, 4, 3, 1, -2]));
    case 'S27': return new StandardCard('S27', CardSize.HIGH, 7, 5, 5, new VariableSubscriberProfile([16, 16, 15, 14, 14, 13, 12, 11, 10, 10, 9, 8, 7, 7, 6]));
    case 'S28': return new StandardCard('S28', CardSize.MEDIUM, 3, 6, 2, new VariableSubscriberProfile([13, 13, 12, 11, 11, 11, 10, 10, 10, 10, 9, 8, 7, 5, 2]));
    case 'S29': return new StandardCard('S29', CardSize.VERY_HIGH, 4, 6, 4, new VariableSubscriberProfile([19, 18, 17, 15, 15, 14, 13, 11, 9, 7, 4, 4, 1, 1, -1]));
    case 'S30': return new StandardCard('S30', CardSize.HIGH, 3, 4, 3, new VariableSubscriberProfile([17, 15, 15, 13, 13, 12, 12, 12, 10, 9, 7, 4, 3, 2, -2]));
    case 'S31': return new StandardCard('S31', CardSize.VERY_HIGH, 5, 6, 3, new VariableSubscriberProfile([21, 21, 21, 19, 18, 18, 16, 14, 14, 12, 11, 11, 11, 9, 8]));
    case 'S32': return new StandardCard('S32', CardSize.HIGH, 4, 7, 4, new VariableSubscriberProfile([16, 16, 16, 16, 16, 15, 15, 15, 14, 12, 11, 11, 11, 11, 10]));
    case 'S33': return new StandardCard('S33', CardSize.HIGH, 4, 7, 4, new VariableSubscriberProfile([16, 16, 16, 16, 16, 15, 15, 15, 14, 12, 11, 11, 11, 11, 10]));
    case 'E1': return new ExpediteCard('E1', CardSize.NONE, 4, 6, 4, 0, 18, 0, 4000);
    case 'E2': return new ExpediteCard('E2', CardSize.NONE, 2, 3, 4, -6, 21, 0, 0);
    case 'I1': return new IntangibleCard('I1', CardSize.NONE, 1, 4, 2);
    case 'I2': return new IntangibleCard('I2', CardSize.NONE, 2, 2, 5);
    case 'I3': return new IntangibleCard('I3', CardSize.NONE, 1, 3, 3);
    case 'F1': return new FixedDateCard('F1', CardSize.NONE, 4, 3, 6, 0, 15, -1500, 0);
    case 'F2': return new FixedDateCard('F2', CardSize.NONE, 5, 6, 4, 30, 21, 0, 0);
    default:
      throw new Error(`Unknown card: ${name}`);
  }
}

