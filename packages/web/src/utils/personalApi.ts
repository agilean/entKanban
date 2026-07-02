const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type PersonalLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalPoints: number;
  gamePoints: number;
  wastePoints: number;
  gameCount: number;
  wasteSubmissionCount: number;
};

export type PersonalPointsSummary = {
  totalPoints: number;
  gamePoints: number;
  wastePoints: number;
  breakdown: Array<{
    source: string;
    points: number;
    count: number;
  }>;
};

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; status: number; error?: string }> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      signal: controller.signal,
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
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { data: null, status: 0, error: '请求超时' };
    }
    return { data: null, status: 0, error: 'Network error' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchPersonalLeaderboard(limit = 50): Promise<PersonalLeaderboardEntry[]> {
  const result = await requestJson<{ entries: PersonalLeaderboardEntry[] }>(
    `/personal/leaderboard?limit=${limit}`,
  );
  return result.data?.entries ?? [];
}

export async function fetchMyPersonalPoints(): Promise<PersonalPointsSummary | null> {
  const result = await requestJson<{ summary: PersonalPointsSummary }>('/personal/me');
  return result.data?.summary ?? null;
}
