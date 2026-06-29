import { onUnmounted, reactive, ref, shallowRef } from 'vue';
import { EvacuationEngine } from '../simulation/evacuation/engine';
import type { ObstacleKind, SimConfig, SimStats } from '../simulation/evacuation/types';

const FIXED_AGENT_COUNT = 50;

export function useEvacuationSim(initialConfig?: Partial<SimConfig>) {
  const engine = shallowRef(
    new EvacuationEngine({ agentCount: FIXED_AGENT_COUNT, ...initialConfig }),
  );
  const stats = reactive<SimStats>({ ...engine.value.stats });
  const panicRatio = ref(engine.value.config.panicRatio);
  const runSessionId = ref(crypto.randomUUID());
  const frameTick = ref(0);

  let rafId: number | null = null;
  let lastFrameTime: number | null = null;
  let drawCallback: (() => void) | null = null;

  function registerDrawCallback(cb: () => void): void {
    drawCallback = cb;
  }

  function unregisterDrawCallback(): void {
    drawCallback = null;
  }

  function syncStats(): void {
    const s = engine.value.stats;
    stats.elapsedTime = s.elapsedTime;
    stats.evacuatedCount = s.evacuatedCount;
    stats.totalAgents = s.totalAgents;
    stats.exitIntervals = s.exitIntervals;
    stats.avgExitInterval = s.avgExitInterval;
    stats.isComplete = s.isComplete;
    stats.isRunning = s.isRunning;
  }

  function bumpFrame(): void {
    frameTick.value++;
    syncStats();
    drawCallback?.();
  }

  function tick(now: number): void {
    if (lastFrameTime !== null) {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
      engine.value.step(dt);
      syncStats();
      frameTick.value++;
      drawCallback?.();
    }
    lastFrameTime = now;

    if (engine.value.isRunning) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      lastFrameTime = null;
    }
  }

  function startLoop(): void {
    if (rafId !== null) return;
    lastFrameTime = null;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastFrameTime = null;
  }

  function start(): void {
    if (stats.isComplete) {
      reset();
    }
    runSessionId.value = crypto.randomUUID();
    engine.value.start();
    syncStats();
    startLoop();
  }

  function pause(): void {
    engine.value.pause();
    syncStats();
    stopLoop();
  }

  function reset(): void {
    stopLoop();
    runSessionId.value = crypto.randomUUID();
    engine.value.reset({
      agentCount: FIXED_AGENT_COUNT,
      panicRatio: panicRatio.value,
    });
    bumpFrame();
  }

  function setPanicRatio(ratio: number): void {
    panicRatio.value = Math.max(0, Math.min(100, Math.round(ratio)));
    if (!engine.value.isRunning) {
      engine.value.reset({
        agentCount: FIXED_AGENT_COUNT,
        panicRatio: panicRatio.value,
      });
      bumpFrame();
    }
  }

  function dropObstacle(kind: ObstacleKind, cx: number, cy: number): boolean {
    if (engine.value.isRunning) {
      return false;
    }
    const placed = engine.value.addObstacle(kind, cx, cy);
    if (placed) {
      bumpFrame();
      return true;
    }
    return false;
  }

  function clearObstacles(): void {
    if (engine.value.isRunning) return;
    engine.value.clearObstacles();
    bumpFrame();
  }

  onUnmounted(() => {
    stopLoop();
  });

  syncStats();

  return {
    engine,
    stats,
    panicRatio,
    runSessionId,
    frameTick,
    fixedAgentCount: FIXED_AGENT_COUNT,
    start,
    pause,
    reset,
    setPanicRatio,
    dropObstacle,
    clearObstacles,
    syncStats,
    registerDrawCallback,
    unregisterDrawCallback,
  };
}
