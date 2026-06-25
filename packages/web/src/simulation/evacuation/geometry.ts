import type { Agent, Exit, Room, Vec2, WallSegment } from './types';

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-8) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function clampMagnitude(v: Vec2, max: number): Vec2 {
  const len = length(v);
  if (len <= max || len < 1e-8) return v;
  return scale(v, max / len);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestPointOnSegment(p: Vec2, seg: WallSegment): Vec2 {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return { x: seg.x1, y: seg.y1 };

  let t = ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: seg.x1 + t * dx, y: seg.y1 + t * dy };
}

export function segmentDistance(p: Vec2, seg: WallSegment): number {
  const nearest = nearestPointOnSegment(p, seg);
  return distance(p, nearest);
}

export function nearestPointOnExit(p: Vec2, exit: Exit): Vec2 {
  const half = exit.width / 2;
  switch (exit.wall) {
    case 'bottom':
      return { x: Math.max(exit.cx - half, Math.min(exit.cx + half, p.x)), y: exit.cy };
    case 'top':
      return { x: Math.max(exit.cx - half, Math.min(exit.cx + half, p.x)), y: exit.cy };
    case 'left':
      return { x: exit.cx, y: Math.max(exit.cy - half, Math.min(exit.cy + half, p.y)) };
    case 'right':
      return { x: exit.cx, y: Math.max(exit.cy - half, Math.min(exit.cy + half, p.y)) };
  }
}

export function directionTo(from: Vec2, to: Vec2): Vec2 {
  return normalize(sub(to, from));
}

export function hasCrossedExit(agent: Agent, room: Room): boolean {
  const { exit } = room;
  const half = exit.width / 2;
  const xMargin = agent.radius;

  switch (exit.wall) {
    case 'bottom':
      return (
        agent.pos.y <= agent.radius * 0.6 &&
        agent.pos.x >= exit.cx - half - xMargin &&
        agent.pos.x <= exit.cx + half + xMargin
      );
    case 'top':
      return (
        agent.pos.y >= room.height - agent.radius * 0.6 &&
        agent.pos.x >= exit.cx - half - xMargin &&
        agent.pos.x <= exit.cx + half + xMargin
      );
    case 'left':
      return (
        agent.pos.x <= agent.radius * 0.6 &&
        agent.pos.y >= exit.cy - half - xMargin &&
        agent.pos.y <= exit.cy + half + xMargin
      );
    case 'right':
      return (
        agent.pos.x >= room.width - agent.radius * 0.6 &&
        agent.pos.y >= exit.cy - half - xMargin &&
        agent.pos.y <= exit.cy + half + xMargin
      );
  }
}

export function clampAgentInRoom(agent: Agent, room: Room): void {
  const { exit } = room;
  const half = exit.width / 2;
  const r = agent.radius;
  const w = room.width;
  const h = room.height;

  // Allow passage through exit opening on bottom wall
  const inExitZone =
    exit.wall === 'bottom' &&
    agent.pos.x >= exit.cx - half - r * 1.5 &&
    agent.pos.x <= exit.cx + half + r * 1.5;

  agent.pos.x = Math.max(r, Math.min(w - r, agent.pos.x));

  if (inExitZone) {
    agent.pos.y = Math.min(h - r, agent.pos.y);
  } else {
    agent.pos.y = Math.max(r, Math.min(h - r, agent.pos.y));
  }
}

export function buildRoomWalls(width: number, height: number, exit: Exit): WallSegment[] {
  const half = exit.width / 2;
  const walls: WallSegment[] = [];

  if (exit.wall === 'bottom') {
    walls.push({ x1: 0, y1: 0, x2: exit.cx - half, y2: 0 });
    walls.push({ x1: exit.cx + half, y1: 0, x2: width, y2: 0 });
    walls.push({ x1: 0, y1: 0, x2: 0, y2: height });
    walls.push({ x1: width, y1: 0, x2: width, y2: height });
    walls.push({ x1: 0, y1: height, x2: width, y2: height });
  } else {
    walls.push({ x1: 0, y1: 0, x2: width, y2: 0 });
    walls.push({ x1: 0, y1: 0, x2: 0, y2: height });
    walls.push({ x1: width, y1: 0, x2: width, y2: height });
    walls.push({ x1: 0, y1: height, x2: width, y2: height });
  }

  return walls;
}
