import { buildRoomWalls } from './geometry';
import type { Agent, Room, SimConfig } from './types';

export const DEFAULT_ROOM: Room = {
  width: 7,
  height: 7,
  exit: {
    cx: 3.5,
    cy: 0,
    width: 0.6,
    wall: 'bottom',
  },
  walls: [],
};

DEFAULT_ROOM.walls = buildRoomWalls(DEFAULT_ROOM.width, DEFAULT_ROOM.height, DEFAULT_ROOM.exit);

export const DEFAULT_CONFIG: SimConfig = {
  agentCount: 50,
  panicMode: false,
  normalSpeed: 0.85,
  panicSpeed: 1.35,
  relaxationTime: 0.65,
  pedRepulsionA: 2000,
  pedRepulsionB: 0.08,
  wallRepulsionA: 3000,
  wallRepulsionB: 0.08,
  agentRadius: 0.3,
  agentMass: 80,
  maxSpeed: 2.2,
  fixedDt: 0.05,
  subSteps: 3,
};

/** Grid placement — always produces exactly `count` agents */
export function createAgents(count: number, room: Room, config: SimConfig): Agent[] {
  const margin = config.agentRadius + 0.08;
  const usableW = room.width - 2 * margin;
  const usableH = room.height - 2 * margin;

  const aspect = usableW / usableH;
  const cols = Math.ceil(Math.sqrt(count * aspect));
  const rows = Math.ceil(count / cols);
  const spacingX = usableW / cols;
  const spacingY = usableH / rows;

  const minSpacing = config.agentRadius * 2;
  const canJitter =
    spacingX >= minSpacing * 1.08 && spacingY >= minSpacing * 1.08;

  const agents: Agent[] = [];
  let id = 0;

  for (let row = 0; row < rows && id < count; row++) {
    for (let col = 0; col < cols && id < count; col++) {
      const jx = canJitter ? (Math.random() - 0.5) * spacingX * 0.08 : 0;
      const jy = canJitter ? (Math.random() - 0.5) * spacingY * 0.08 : 0;
      agents.push(
        makeAgent(
          id,
          {
            x: margin + (col + 0.5) * spacingX + jx,
            y: margin + (row + 0.5) * spacingY + jy,
          },
          config,
        ),
      );
      id++;
    }
  }

  return agents;
}

function makeAgent(id: number, pos: { x: number; y: number }, config: SimConfig): Agent {
  return {
    id,
    pos,
    vel: { x: 0, y: 0 },
    force: { x: 0, y: 0 },
    mass: config.agentMass,
    radius: config.agentRadius,
    evacuated: false,
    evacuatedAt: null,
  };
}
