export interface Vec2 {
  x: number;
  y: number;
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Exit {
  /** Center of exit opening on the wall */
  cx: number;
  cy: number;
  /** Exit width in meters */
  width: number;
  /** Which wall: 'bottom' | 'top' | 'left' | 'right' */
  wall: 'bottom' | 'top' | 'left' | 'right';
}

export interface Room {
  width: number;
  height: number;
  walls: WallSegment[];
  exit: Exit;
}

export interface Agent {
  id: number;
  pos: Vec2;
  vel: Vec2;
  force: Vec2;
  mass: number;
  radius: number;
  evacuated: boolean;
  evacuatedAt: number | null;
}

export interface SimConfig {
  agentCount: number;
  panicMode: boolean;
  normalSpeed: number;
  panicSpeed: number;
  relaxationTime: number;
  pedRepulsionA: number;
  pedRepulsionB: number;
  wallRepulsionA: number;
  wallRepulsionB: number;
  agentRadius: number;
  agentMass: number;
  maxSpeed: number;
  fixedDt: number;
  subSteps: number;
}

export interface SimStats {
  elapsedTime: number;
  evacuatedCount: number;
  totalAgents: number;
  exitIntervals: number[];
  avgExitInterval: number;
  isComplete: boolean;
  isRunning: boolean;
}

export interface SimSnapshot {
  agents: Agent[];
  room: Room;
  stats: SimStats;
  config: SimConfig;
}
