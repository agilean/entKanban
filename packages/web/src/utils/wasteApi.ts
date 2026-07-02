const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type WasteComment = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type WasteTeamMember = {
  userId: string;
  name: string;
  joinedAt: string;
};

export type WasteEntry = {
  id: string;
  description: string;
  authorNickname: string;
  createdAt: string;
  upvoteCount: number;
  commentCount: number;
  teamCount: number;
  hasUpvoted: boolean;
  hasJoinedTeam: boolean;
  comments: WasteComment[];
  teamMembers: WasteTeamMember[];
};

export type WasteLeaderboardEntry = {
  rank: number;
  nickname: string;
  score: number;
  submissionCount: number;
  upvoteCount: number;
  commentCount: number;
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
      return { data: null, status: 0, error: '请求超时，请稍后重试' };
    }
    return { data: null, status: 0, error: 'Network error' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchWasteLeaderboard(limit = 50): Promise<WasteLeaderboardEntry[]> {
  const result = await requestJson<{ entries: WasteLeaderboardEntry[] }>(`/waste/leaderboard?limit=${limit}`);
  return result.data?.entries ?? [];
}

export async function fetchWasteEntries(limit = 20, offset = 0): Promise<WasteEntry[]> {
  const result = await requestJson<{ entries: WasteEntry[] }>(
    `/waste/entries?limit=${limit}&offset=${offset}`,
  );
  return result.data?.entries ?? [];
}

export async function submitWasteEntry(
  nickname: string,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await requestJson<{ entry: unknown }>('/waste/entries', {
    method: 'POST',
    body: JSON.stringify({ nickname, description }),
  });
  if (result.status === 201) {
    return { ok: true };
  }
  return { ok: false, error: result.error ?? '提交失败' };
}

export async function upvoteWasteEntry(
  id: string,
): Promise<{ upvoteCount: number } | { error: string }> {
  const result = await requestJson<{ upvoteCount: number }>(`/waste/entries/${id}/upvote`, {
    method: 'POST',
  });
  if (result.data) {
    return result.data;
  }
  return { error: result.error ?? '顶失败' };
}

export async function commentWasteEntry(
  id: string,
  content: string,
): Promise<{ comment: WasteComment } | { error: string }> {
  const result = await requestJson<{ comment: WasteComment }>(`/waste/entries/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (result.data) {
    return result.data;
  }
  return { error: result.error ?? '评论失败' };
}

export async function joinWasteTeam(
  id: string,
): Promise<{ teamCount: number; teamMembers: WasteTeamMember[] } | { error: string }> {
  const result = await requestJson<{ teamCount: number; teamMembers: WasteTeamMember[] }>(
    `/waste/entries/${id}/team`,
    { method: 'POST' },
  );
  if (result.data) {
    return result.data;
  }
  return { error: result.error ?? '加入战队失败' };
}
