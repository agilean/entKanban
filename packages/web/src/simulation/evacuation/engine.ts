import { clampAgentInRoom, clampMagnitude, hasCrossedExit } from './geometry';
import { clampAgentOutsideObstacles, canPlaceObstacle, createObstacle, MAX_OBSTACLES } from './obstacles';
import { totalForce } from './forces';
import { createAgents, cloneRoom, DEFAULT_CONFIG, DEFAULT_ROOM } from './presets';
import type { Agent, Obstacle, ObstacleKind, Room, SimConfig, SimStats } from './types';

export class EvacuationEngine {
  room: Room;
  config: SimConfig;
  agents: Agent[] = [];
  elapsedTime = 0;
  lastEvacuationTime: number | null = null;
  exitIntervals: number[] = [];
  isRunning = false;

  constructor(config: Partial<SimConfig> = {}, room: Room = DEFAULT_ROOM) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.room = cloneRoom(room);
    this.reset();
  }

  reset(config?: Partial<SimConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.agents = createAgents(this.config.agentCount, this.room, this.config);
    this.elapsedTime = 0;
    this.lastEvacuationTime = null;
    this.exitIntervals = [];
    this.isRunning = false;
  }

  redistributeAgents(): void {
    this.agents = createAgents(this.config.agentCount, this.room, this.config);
    this.elapsedTime = 0;
    this.lastEvacuationTime = null;
    this.exitIntervals = [];
    this.isRunning = false;
  }

  addObstacle(kind: ObstacleKind, cx: number, cy: number): Obstacle | null {
    if (this.isRunning || this.room.obstacles.length >= MAX_OBSTACLES) {
      return null;
    }
    const obstacle = createObstacle(kind, cx, cy);
    if (!canPlaceObstacle(this.room, obstacle, this.room.obstacles)) {
      return null;
    }
    this.room.obstacles.push(obstacle);
    this.redistributeAgents();
    return obstacle;
  }

  removeObstacle(id: string): void {
    if (this.isRunning) return;
    this.room.obstacles = this.room.obstacles.filter((o) => o.id !== id);
    this.redistributeAgents();
  }

  clearObstacles(): void {
    if (this.isRunning) return;
    this.room.obstacles = [];
    this.redistributeAgents();
  }

  start(): void {
    this.isRunning = true;
  }

  pause(): void {
    this.isRunning = false;
  }

  get activeAgents(): Agent[] {
    return this.agents.filter((a) => !a.evacuated);
  }

  get stats(): SimStats {
    const evacuatedCount = this.agents.filter((a) => a.evacuated).length;
    const avgExitInterval =
      this.exitIntervals.length > 0
        ? this.exitIntervals.reduce((s, v) => s + v, 0) / this.exitIntervals.length
        : 0;

    return {
      elapsedTime: this.elapsedTime,
      evacuatedCount,
      totalAgents: this.agents.length,
      exitIntervals: [...this.exitIntervals],
      avgExitInterval,
      isComplete: evacuatedCount === this.agents.length && this.agents.length > 0,
      isRunning: this.isRunning,
    };
  }

  step(frameDt: number): void {
    if (!this.isRunning) return;

    const subDt = this.config.fixedDt;
    const steps = Math.max(1, Math.min(this.config.subSteps, Math.ceil(frameDt / subDt)));

    for (let s = 0; s < steps; s++) {
      this.simulateSubStep(subDt);
      this.elapsedTime += subDt;
      if (this.stats.isComplete) {
        this.isRunning = false;
        break;
      }
    }
  }

  private simulateSubStep(dt: number): void {
    const active = this.activeAgents;
    if (active.length === 0) return;

    for (const agent of active) {
      agent.force = totalForce(agent, active, this.room, this.config, this.elapsedTime);
    }

    for (const agent of active) {
      agent.vel.x += (agent.force.x / agent.mass) * dt;
      agent.vel.y += (agent.force.y / agent.mass) * dt;

      const maxSpeed = agent.isPanic
        ? this.config.panicSpeed * 1.1
        : this.config.maxSpeed;
      agent.vel = clampMagnitude(agent.vel, maxSpeed);

      agent.pos.x += agent.vel.x * dt;
      agent.pos.y += agent.vel.y * dt;

      clampAgentInRoom(agent, this.room);
      clampAgentOutsideObstacles(agent, this.room.obstacles);

      if (this.canEvacuate(agent)) {
        this.evacuate(agent);
      }
    }
  }

  /** Serial bottleneck at exit with congestion-based delay (FIS in panic mode) */
  private canEvacuate(agent: Agent): boolean {
    if (!hasCrossedExit(agent, this.room)) return false;

    const { exit } = this.room;
    const half = exit.width / 2;
    const crossingThreshold = agent.radius * 1.5;

    const nearExit = this.activeAgents.filter(
      (a) =>
        a.pos.y < 2 &&
        a.pos.x >= exit.cx - half - a.radius * 2 &&
        a.pos.x <= exit.cx + half + a.radius * 2,
    );
    const panicNearExit = nearExit.filter((a) => a.isPanic).length;
    let minGap = 0.28;
    if (agent.isPanic && panicNearExit > 3) {
      minGap += (panicNearExit - 3) * 0.12;
    }

    if (
      this.lastEvacuationTime !== null &&
      this.elapsedTime - this.lastEvacuationTime < minGap
    ) {
      return false;
    }

    const blockers = nearExit.filter(
      (a) =>
        a.id !== agent.id &&
        a.pos.y < crossingThreshold &&
        a.pos.x >= exit.cx - half - agent.radius &&
        a.pos.x <= exit.cx + half + agent.radius,
    );

    if (blockers.length === 0) return true;

    const frontmost = blockers.reduce((best, a) => (a.pos.y < best.pos.y ? a : best));
    return agent.pos.y <= frontmost.pos.y + 0.02;
  }

  private evacuate(agent: Agent): void {
    agent.evacuated = true;
    agent.evacuatedAt = this.elapsedTime;
    agent.vel = { x: 0, y: 0 };

    if (this.lastEvacuationTime !== null) {
      this.exitIntervals.push(this.elapsedTime - this.lastEvacuationTime);
    }
    this.lastEvacuationTime = this.elapsedTime;
  }
}
