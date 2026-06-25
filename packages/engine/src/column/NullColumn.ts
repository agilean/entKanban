import { ClassOfService } from '../ClassOfService.js';
import type { Context } from '../Context.js';
import type { Card } from '../card/Card.js';
import { AbstractColumn } from './AbstractColumn.js';

export class NullColumn extends AbstractColumn {
  addCard(_card: Card, _cos: ClassOfService): void {}

  getCards(): Card[] {
    return [];
  }

  pull(_context: Context, _cos: ClassOfService): Card | undefined {
    return undefined;
  }

  clear(): void {}
}
