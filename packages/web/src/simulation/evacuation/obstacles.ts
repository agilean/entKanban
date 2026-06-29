import { distance, normalize, sub } from './geometry';
import type { Agent, Obstacle, ObstacleKind, Room, SimConfig, Vec2 } from './types';

const OBSTACLE_DEFAULTS: Record<ObstacleKind, { rx: number; ry: number }> = {
  circle: { rx: 0.55, ry: 0.55 },
  rect: { rx: 0.48, ry: 0.48 },
  ellipse: { rx: 0.72, ry: 0.4 },
};

export const MAX_OBSTACLES = 10;

export function createObstacle(kind: ObstacleKind, cx: number, cy: number, id?: string): Obstacle {
  const size = OBSTACLE_DEFAULTS[kind];
  return {
    id: id ?? crypto.randomUUID(),
    kind,
    cx,
    cy,
    rx: size.rx,
    ry: size.ry,
  };
}

export function obstacleAabb(obstacle: Obstacle): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  return {
    minX: obstacle.cx - obstacle.rx,
    maxX: obstacle.cx + obstacle.rx,
    minY: obstacle.cy - obstacle.ry,
    maxY: obstacle.cy + obstacle.ry,
  };
}

export function obstacleClearance(pos: Vec2, obstacle: Obstacle): number {
  switch (obstacle.kind) {
    case 'circle':
      return distance(pos, { x: obstacle.cx, y: obstacle.cy }) - obstacle.rx;
    case 'rect': {
      const dx = Math.abs(pos.x - obstacle.cx) - obstacle.rx;
      const dy = Math.abs(pos.y - obstacle.cy) - obstacle.ry;
      if (dx <= 0 && dy <= 0) {
        return Math.max(dx, dy);
      }
      if (dx <= 0) return dy;
      if (dy <= 0) return dx;
      return Math.hypot(dx, dy);
    }
    case 'ellipse': {
      const nx = (pos.x - obstacle.cx) / obstacle.rx;
      const ny = (pos.y - obstacle.cy) / obstacle.ry;
      const k = Math.hypot(nx, ny);
      const scale = Math.min(obstacle.rx, obstacle.ry);
      return (k - 1) * scale;
    }
  }
}

export function nearestPointOnObstacle(pos: Vec2, obstacle: Obstacle): Vec2 {
  switch (obstacle.kind) {
    case 'circle': {
      const dir = normalize(sub(pos, { x: obstacle.cx, y: obstacle.cy }));
      if (dir.x === 0 && dir.y === 0) {
        return { x: obstacle.cx + obstacle.rx, y: obstacle.cy };
      }
      return {
        x: obstacle.cx + dir.x * obstacle.rx,
        y: obstacle.cy + dir.y * obstacle.rx,
      };
    }
    case 'rect': {
      const x = Math.max(obstacle.cx - obstacle.rx, Math.min(obstacle.cx + obstacle.rx, pos.x));
      const y = Math.max(obstacle.cy - obstacle.ry, Math.min(obstacle.cy + obstacle.ry, pos.y));
      if (
        pos.x >= obstacle.cx - obstacle.rx &&
        pos.x <= obstacle.cx + obstacle.rx &&
        pos.y >= obstacle.cy - obstacle.ry &&
        pos.y <= obstacle.cy + obstacle.ry
      ) {
        const toLeft = pos.x - (obstacle.cx - obstacle.rx);
        const toRight = obstacle.cx + obstacle.rx - pos.x;
        const toBottom = pos.y - (obstacle.cy - obstacle.ry);
        const toTop = obstacle.cy + obstacle.ry - pos.y;
        const min = Math.min(toLeft, toRight, toBottom, toTop);
        if (min === toLeft) return { x: obstacle.cx - obstacle.rx, y: pos.y };
        if (min === toRight) return { x: obstacle.cx + obstacle.rx, y: pos.y };
        if (min === toBottom) return { x: pos.x, y: obstacle.cy - obstacle.ry };
        return { x: pos.x, y: obstacle.cy + obstacle.ry };
      }
      return { x, y };
    }
    case 'ellipse': {
      const dx = pos.x - obstacle.cx;
      const dy = pos.y - obstacle.cy;
      if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) {
        return { x: obstacle.cx + obstacle.rx, y: obstacle.cy };
      }
      const angle = Math.atan2(dy / obstacle.ry, dx / obstacle.rx);
      return {
        x: obstacle.cx + obstacle.rx * Math.cos(angle),
        y: obstacle.cy + obstacle.ry * Math.sin(angle),
      };
    }
  }
}

function effectiveRadius(obstacle: Obstacle): number {
  if (obstacle.kind === 'circle') return obstacle.rx;
  return Math.hypot(obstacle.rx, obstacle.ry);
}

function aabbIntersects(
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number },
): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function exitKeepoutZone(room: Room): { minX: number; maxX: number; minY: number; maxY: number } {
  const half = room.exit.width / 2;
  return {
    minX: room.exit.cx - half - 0.25,
    maxX: room.exit.cx + half + 0.25,
    minY: 0,
    maxY: 1.4,
  };
}

export function canPlaceObstacle(room: Room, obstacle: Obstacle, existing: Obstacle[]): boolean {
  const wallMargin = 0.1;
  const box = obstacleAabb(obstacle);
  if (
    box.minX < wallMargin ||
    box.maxX > room.width - wallMargin ||
    box.minY < wallMargin ||
    box.maxY > room.height - wallMargin
  ) {
    return false;
  }

  if (aabbIntersects(box, exitKeepoutZone(room))) {
    return false;
  }

  for (const other of existing) {
    const dist = distance({ x: obstacle.cx, y: obstacle.cy }, { x: other.cx, y: other.cy });
    if (dist < effectiveRadius(obstacle) + effectiveRadius(other) - 0.05) {
      return false;
    }
  }

  return true;
}

export function pointBlockedByObstacles(
  pos: Vec2,
  obstacles: Obstacle[],
  agentRadius: number,
): boolean {
  const margin = agentRadius + 0.04;
  return obstacles.some((obstacle) => obstacleClearance(pos, obstacle) < margin);
}

export function clampAgentOutsideObstacles(agent: Agent, obstacles: Obstacle[]): void {
  for (const obstacle of obstacles) {
    const clearance = obstacleClearance(agent.pos, obstacle);
    if (clearance >= agent.radius) continue;

    const nearest = nearestPointOnObstacle(agent.pos, obstacle);
    let dir = normalize(sub(agent.pos, nearest));
    if (dir.x === 0 && dir.y === 0) {
      dir = normalize(sub(agent.pos, { x: obstacle.cx, y: obstacle.cy }));
    }
    if (dir.x === 0 && dir.y === 0) {
      dir = { x: 1, y: 0 };
    }
    agent.pos.x = nearest.x + dir.x * (agent.radius + 0.01);
    agent.pos.y = nearest.y + dir.y * (agent.radius + 0.01);
  }
}

function repulsionForce(
  pos: Vec2,
  nearest: Vec2,
  dist: number,
  A: number,
  B: number,
): Vec2 {
  if (dist < 1e-6) {
    return { x: (Math.random() - 0.5) * A, y: (Math.random() - 0.5) * A };
  }
  const overlap = -dist;
  const magnitude = A * Math.exp(overlap / B);
  const dir = normalize(sub(pos, nearest));
  return { x: dir.x * magnitude, y: dir.y * magnitude };
}

export function obstacleRepulsion(agent: Agent, obstacles: Obstacle[], config: SimConfig): Vec2 {
  let force: Vec2 = { x: 0, y: 0 };
  const A = agent.isPanic ? config.wallRepulsionA * 1.2 : config.wallRepulsionA;

  for (const obstacle of obstacles) {
    const nearest = nearestPointOnObstacle(agent.pos, obstacle);
    const dist = distance(agent.pos, nearest) - agent.radius;
    force = {
      x: force.x + repulsionForce(agent.pos, nearest, dist, A, config.wallRepulsionB).x,
      y: force.y + repulsionForce(agent.pos, nearest, dist, A, config.wallRepulsionB).y,
    };
  }

  return force;
}
