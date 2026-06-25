import { onUnmounted, reactive, ref, shallowRef } from 'vue';
import { EvacuationEngine } from '../simulation/evacuation/engine';
import type { SimConfig, SimStats } from '../simulation/evacuation/types';

export function useEvacuationSim(initialConfig?: Partial<SimConfig>) {
  const engine = shallowRef(new EvacuationEngine(initialConfig));
  const stats = reactive<SimStats>({ ...engine.value.stats });
  const panicMode = ref(engine.value.config.panicMode);
  const agentCount = ref(engine.value.config.agentCount);
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
    engine.value.reset({
      agentCount: agentCount.value,
      panicMode: panicMode.value,
    });
    frameTick.value++;
    syncStats();
    drawCallback?.();
  }

  function setAgentCount(count: number): void {
    agentCount.value = count;
    if (!engine.value.isRunning) {
      engine.value.reset({ agentCount: count, panicMode: panicMode.value });
      frameTick.value++;
      syncStats();
      drawCallback?.();
    }
  }

  function setPanicMode(panic: boolean): void {
    panicMode.value = panic;
    if (!engine.value.isRunning) {
      engine.value.reset({ agentCount: agentCount.value, panicMode: panic });
      frameTick.value++;
      syncStats();
      drawCallback?.();
    }
  }

  onUnmounted(() => {
    stopLoop();
  });

  syncStats();

  return {
    engine,
    stats,
    panicMode,
    agentCount,
    frameTick,
    start,
    pause,
    reset,
    setAgentCount,
    setPanicMode,
    syncStats,
    registerDrawCallback,
    unregisterDrawCallback,
  };
}
