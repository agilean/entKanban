import type { DiceRollLogEntry, GameSessionState } from '@kanban-game/engine';

export const REPLAY_SESSION_ID_KEY = 'kanban-replay-session-id';
export const ACTIVE_PLAY_SESSION_KEY = 'kanban-active-play-session-id';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type ReplayPayload = {
  sessionId: string;
  session: GameSessionState;
  diceRolls: DiceRollLogEntry[];
  createdAt: string;
  updatedAt: string;
};

export type SessionSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  currentDay: number;
  phase: string;
  diceRollCount: number;
};

export type ReplaySyncStatus = 'idle' | 'syncing' | 'online' | 'offline';

function getOrCreateReplaySessionId(): string {
  const existing = localStorage.getItem(REPLAY_SESSION_ID_KEY);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  localStorage.setItem(REPLAY_SESSION_ID_KEY, id);
  return id;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function checkReplayServerHealth(): Promise<boolean> {
  const result = await requestJson<{ ok: boolean }>('/health');
  return result?.ok === true;
}

export function getReplaySessionId(): string {
  return getOrCreateReplaySessionId();
}

export function resetReplaySessionId(): string {
  const id = crypto.randomUUID();
  localStorage.setItem(REPLAY_SESSION_ID_KEY, id);
  return id;
}

export function setReplaySessionId(id: string): void {
  localStorage.setItem(REPLAY_SESSION_ID_KEY, id);
}

export function getActivePlaySessionId(): string | null {
  return localStorage.getItem(ACTIVE_PLAY_SESSION_KEY);
}

export function setActivePlaySessionId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_PLAY_SESSION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PLAY_SESSION_KEY);
  }
}

export async function syncSessionSnapshot(session: GameSessionState): Promise<boolean> {
  const sessionId = getOrCreateReplaySessionId();
  const result = await requestJson<{ ok: boolean }>(`/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify({ session }),
  });
  return result?.ok === true;
}

export async function pushDiceRollToServer(entry: DiceRollLogEntry): Promise<boolean> {
  const sessionId = getOrCreateReplaySessionId();
  const result = await requestJson<{ ok: boolean; inserted?: boolean }>('/dice-rolls', {
    method: 'POST',
    body: JSON.stringify({ sessionId, entry }),
  });
  return result?.ok === true;
}

export async function fetchReplay(sessionId = getReplaySessionId()): Promise<ReplayPayload | null> {
  return requestJson<ReplayPayload>(`/replay/${sessionId}`);
}

export async function listReplaySessions(limit = 20): Promise<SessionSummary[]> {
  const result = await requestJson<{ sessions: SessionSummary[] }>(`/sessions?limit=${limit}`);
  return result?.sessions ?? [];
}

export async function downloadReplayFromServer(sessionId = getReplaySessionId()): Promise<void> {
  const replay = await fetchReplay(sessionId);
  if (!replay) {
    throw new Error('无法从服务器获取回放数据');
  }
  const blob = new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `kanban-replay-${sessionId.slice(0, 8)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
