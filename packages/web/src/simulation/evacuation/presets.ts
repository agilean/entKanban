import { buildRoomWalls } from './geometry';
import type { Agent, Room, SimConfig } from './types';

export const DEFAULT_ROOM: Room = {
  width: 7,
  height: 7,
  exit: {
    cx: 3.5,
    cy: 0,
    width: 0.35,
    wall: 'bottom',
  },
  walls: [],
};

DEFAULT_ROOM.walls = buildRoomWalls(DEFAULT_ROOM.width, DEFAULT_ROOM.height, DEFAULT_ROOM.exit);

export const DEFAULT_CONFIG: SimConfig = {
  agentCount: 50,
  panicRatio: 0,
  normalSpeed: 0.85,
  panicSpeed: 1.35,
  relaxationTime: 0.65,
  pedRepulsionA: 2000,
  pedRepulsionB: 0.08,
  wallRepulsionA: 3000,
  wallRepulsionB: 0.08,
  agentRadius: 0.12,
  agentMass: 80,
  maxSpeed: 2.2,
  fixedDt: 0.05,
  subSteps: 3,
};

function gridPosition(
  index: number,
  count: number,
  margin: number,
  usableW: number,
  usableH: number,
): { x: number; y: number } {
  const aspect = usableW / usableH;
  const cols = Math.ceil(Math.sqrt(count * aspect));
  const rows = Math.ceil(count / cols);
  const spacingX = usableW / cols;
  const spacingY = usableH / rows;
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    x: margin + (col + 0.5) * spacingX,
    y: margin + (row + 0.5) * spacingY,
  };
}

function isValidPosition(
  pos: { x: number; y: number },
  agents: Agent[],
  minDist: number,
): boolean {
  for (const agent of agents) {
    const dx = pos.x - agent.pos.x;
    const dy = pos.y - agent.pos.y;
    if (dx * dx + dy * dy < minDist * minDist) {
      return false;
    }
  }
  return true;
}

/** Random scatter with grid fallback — always produces exactly `count` agents */
export function createAgents(count: number, room: Room, config: SimConfig): Agent[] {
  const margin = config.agentRadius + 0.08;
  const usableW = room.width - 2 * margin;
  const usableH = room.height - 2 * margin;
  const minDist = config.agentRadius * 2 + 0.05;
  const maxAttempts = 80;

  const agents: Agent[] = [];

  for (let id = 0; id < count; id++) {
    let pos: { x: number; y: number } | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = {
        x: margin + Math.random() * usableW,
        y: margin + Math.random() * usableH,
      };
      if (isValidPosition(candidate, agents, minDist)) {
        pos = candidate;
        break;
      }
    }

    if (!pos) {
      pos = gridPosition(id, count, margin, usableW, usableH);
    }

    agents.push(makeAgent(id, pos, config));
  }

  assignPanicFlags(agents, config.panicRatio);

  return agents;
}

function assignPanicFlags(agents: Agent[], panicRatio: number): void {
  const panicCount = Math.round((agents.length * panicRatio) / 100);
  const indices = agents.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < panicCount; i++) {
    agents[indices[i]].isPanic = true;
  }
}

function makeAgent(id: number, pos: { x: number; y: number }, config: SimConfig): Agent {
  return {
    id,
    pos,
    vel: { x: 0, y: 0 },
    force: { x: 0, y: 0 },
    mass: config.agentMass,
    radius: config.agentRadius,
    isPanic: false,
    evacuated: false,
    evacuatedAt: null,
  };
}
