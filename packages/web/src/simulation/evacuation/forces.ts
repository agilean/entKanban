import {
  add,
  directionTo,
  nearestPointOnExit,
  nearestPointOnSegment,
  normalize,
  scale,
  segmentDistance,
  sub,
} from './geometry';
import { obstacleRepulsion } from './obstacles';
import type { Agent, Room, SimConfig, Vec2 } from './types';

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
  return scale(dir, magnitude);
}

export function drivingForce(
  agent: Agent,
  room: Room,
  config: SimConfig,
  elapsedTime: number,
): Vec2 {
  const exit = room.exit;
  let target = nearestPointOnExit(agent.pos, exit);

  if (exit.wall === 'bottom' && agent.pos.y < 2) {
    target = { x: exit.cx, y: 0 };
  }

  const e = directionTo(agent.pos, target);

  // Gradual speed ramp after alarm — avoids instant sprint at t=0
  const rampDuration = agent.isPanic ? 4 : 2;
  const ramp = Math.min(1, elapsedTime / rampDuration);
  const eased = ramp * ramp;
  const baseSpeed = agent.isPanic ? config.panicSpeed : config.normalSpeed;
  const v0 = baseSpeed * eased;

  const desiredVel = scale(e, v0);
  return scale(sub(desiredVel, agent.vel), agent.mass / config.relaxationTime);
}

export function pedestrianRepulsion(
  agent: Agent,
  others: Agent[],
  config: SimConfig,
  room: Room,
): Vec2 {
  let force: Vec2 = { x: 0, y: 0 };
  const combinedRadius = config.agentRadius * 2;
  // Panic: weaker repulsion allows compression at bottleneck (FIS)
  const A = agent.isPanic ? config.pedRepulsionA * 0.72 : config.pedRepulsionA;
  const nearExit = agent.pos.y < 1.5 && room.exit.wall === 'bottom';

  for (const other of others) {
    if (other.id === agent.id || other.evacuated) continue;

    const dx = agent.pos.x - other.pos.x;
    const dy = agent.pos.y - other.pos.y;
    const dist = Math.hypot(dx, dy) - combinedRadius;

    const nearest = { x: other.pos.x, y: other.pos.y };
    let repA = A;
    if (agent.isPanic && nearExit && other.pos.y < 1.5) {
      repA *= 0.55;
    }
    force = add(force, repulsionForce(agent.pos, nearest, dist, repA, config.pedRepulsionB));
  }

  return force;
}

export function wallRepulsion(agent: Agent, room: Room, config: SimConfig): Vec2 {
  let force: Vec2 = { x: 0, y: 0 };
  const A = agent.isPanic ? config.wallRepulsionA * 1.2 : config.wallRepulsionA;
  const { exit, walls } = room;
  const half = exit.width / 2;

  for (const wall of walls) {
    // Allow passage through exit opening — skip bottom wall repulsion in corridor
    if (exit.wall === 'bottom' && wall.y1 === 0 && wall.y2 === 0) {
      if (
        agent.pos.x >= exit.cx - half - agent.radius &&
        agent.pos.x <= exit.cx + half + agent.radius &&
        agent.pos.y < 1.5
      ) {
        continue;
      }
    }

    const nearest = nearestPointOnSegment(agent.pos, wall);
    const dist = segmentDistance(agent.pos, wall) - agent.radius;
    force = add(force, repulsionForce(agent.pos, nearest, dist, A, config.wallRepulsionB));
  }

  return force;
}

export function totalForce(
  agent: Agent,
  activeAgents: Agent[],
  room: Room,
  config: SimConfig,
  elapsedTime: number,
): Vec2 {
  return add(
    drivingForce(agent, room, config, elapsedTime),
    add(
      pedestrianRepulsion(agent, activeAgents, config, room),
      add(
        wallRepulsion(agent, room, config),
        obstacleRepulsion(agent, room.obstacles, config),
      ),
    ),
  );
}
