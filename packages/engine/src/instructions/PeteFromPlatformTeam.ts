import type { Board } from '../Board.js';
import type { Instruction } from './Instruction.js';

/** Blocker 机制已移除，保留指令占位以兼容日程配置。 */
export class PeteFromPlatformTeam implements Instruction {
  execute(_board: Board): void {}
}
