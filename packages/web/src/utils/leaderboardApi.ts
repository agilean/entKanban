const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type LeaderboardGameType = 'kanban' | 'evacuation';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  orgId: string | null;
  orgName: string | null;
  score: number;
  deployedCount: number;
  snapshotCount: number;
  completedAt: string;
};

export type SubmitResultInput = {
  sessionId: string;
  score: number;
  deployedCount: number;
  snapshotCount: number;
  playSessionId?: string | null;
  gameType?: LeaderboardGameType;
};

export type SubmitEvacuationResultInput = {
  sessionId: string;
  elapsedTime: number;
  panicRatio: number;
  agentCount: number;
};

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; status: number; error?: string }> {
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
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return { data: null, status: response.status, error: payload?.error };
    }
    const data = (await response.json()) as T;
    return { data, status: response.status };
  } catch {
    return { data: null, status: 0, error: 'Network error' };
  }
}

export function evacuationScoreFromSeconds(elapsedTime: number): number {
  return Math.max(1, Math.round(elapsedTime * 100));
}

export function formatEvacuationScore(score: number): string {
  return `${(score / 100).toFixed(1)}s`;
}

export async function submitGameResult(input: SubmitResultInput): Promise<boolean> {
  const result = await requestJson<{ result: unknown }>('/results', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.status === 201;
}

export async function submitEvacuationResult(input: SubmitEvacuationResultInput): Promise<boolean> {
  return submitGameResult({
    sessionId: input.sessionId,
    score: evacuationScoreFromSeconds(input.elapsedTime),
    deployedCount: input.panicRatio,
    snapshotCount: input.agentCount,
    gameType: 'evacuation',
  });
}

export async function fetchGlobalLeaderboard(
  limit = 50,
  offset = 0,
  gameType: LeaderboardGameType = 'kanban',
): Promise<LeaderboardEntry[]> {
  const result = await requestJson<{ entries: LeaderboardEntry[] }>(
    `/leaderboard/global?limit=${limit}&offset=${offset}&gameType=${gameType}`,
  );
  return result.data?.entries ?? [];
}

export async function fetchOrgLeaderboard(
  limit = 50,
  offset = 0,
  gameType: LeaderboardGameType = 'kanban',
): Promise<{ org: { id: string; name: string } | null; entries: LeaderboardEntry[] }> {
  const result = await requestJson<{
    org: { id: string; name: string };
    entries: LeaderboardEntry[];
  }>(`/leaderboard/org?limit=${limit}&offset=${offset}&gameType=${gameType}`);
  return {
    org: result.data?.org ?? null,
    entries: result.data?.entries ?? [],
  };
}
