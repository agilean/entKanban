const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type PlaySessionStatus = 'lobby' | 'active' | 'closed';
export type ParticipantStatus = 'joined' | 'playing' | 'completed';

export type PlaySession = {
  id: string;
  hostUserId: string;
  orgId: string | null;
  gameType: string;
  title: string;
  status: PlaySessionStatus;
  createdAt: string;
  startedAt: string | null;
  closedAt: string | null;
};

export type PlaySessionParticipant = {
  playSessionId: string;
  userId: string;
  role: 'host' | 'player';
  status: ParticipantStatus;
  gameSessionId: string | null;
  score: number | null;
  deployedCount: number | null;
  currentDay: number | null;
  phase: string | null;
  joinedAt: string;
  completedAt: string | null;
  userName?: string;
  avatarUrl?: string | null;
};

export type SessionLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  score: number | null;
  deployedCount: number | null;
  currentDay: number | null;
  completedAt: string | null;
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

export async function fetchMyPlaySessions(): Promise<PlaySession[]> {
  const result = await requestJson<{ playSessions: PlaySession[] }>('/play-sessions');
  return result.data?.playSessions ?? [];
}

export async function createPlaySession(input: {
  title: string;
  gameType?: string;
  orgId?: string | null;
}): Promise<PlaySession | null> {
  const result = await requestJson<{ playSession: PlaySession }>('/play-sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.data?.playSession ?? null;
}

export async function fetchPlaySession(id: string): Promise<{
  playSession: PlaySession;
  participants: PlaySessionParticipant[];
} | null> {
  const result = await requestJson<{
    playSession: PlaySession;
    participants: PlaySessionParticipant[];
  }>(`/play-sessions/${id}`);
  return result.data ?? null;
}

export async function joinPlaySession(id: string): Promise<boolean> {
  const result = await requestJson<{ ok: boolean }>(`/play-sessions/${id}/join`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.data?.ok === true;
}

export async function startPlaySession(id: string): Promise<PlaySession | null> {
  const result = await requestJson<{ playSession: PlaySession }>(`/play-sessions/${id}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.data?.playSession ?? null;
}

export async function createPlaySessionInvitation(id: string): Promise<{
  token: string;
  expiresAt: string;
  inviteUrl: string;
} | null> {
  const result = await requestJson<{
    invitation: { token: string; expiresAt: string; inviteUrl: string };
  }>(`/play-sessions/${id}/invitations`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.data?.invitation ?? null;
}

export async function fetchPlaySessionInvitationPreview(token: string): Promise<{
  token: string;
  playSessionTitle: string;
  gameType: string;
  status: string;
  expired: boolean;
  expiresAt: string;
} | null> {
  const result = await requestJson<{
    invitation: {
      token: string;
      playSessionTitle: string;
      gameType: string;
      status: string;
      expired: boolean;
      expiresAt: string;
    };
  }>(`/play-sessions/invitations/${token}`);
  return result.data?.invitation ?? null;
}

export async function acceptPlaySessionInvitation(token: string): Promise<PlaySession | null> {
  const result = await requestJson<{ playSession: PlaySession }>(
    `/play-sessions/invitations/${token}/accept`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return result.data?.playSession ?? null;
}

export async function startPlayInSession(playSessionId: string): Promise<{
  gameSessionId: string;
  playSessionId: string;
} | null> {
  const result = await requestJson<{ gameSessionId: string; playSessionId: string }>(
    `/play-sessions/${playSessionId}/plays`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return result.data ?? null;
}

export async function fetchPlaySessionLeaderboard(playSessionId: string): Promise<SessionLeaderboardEntry[]> {
  const result = await requestJson<{ entries: SessionLeaderboardEntry[] }>(
    `/play-sessions/${playSessionId}/leaderboard`,
  );
  return result.data?.entries ?? [];
}

export async function fetchPlaySessionProgress(playSessionId: string): Promise<{
  playSession: { id: string; title: string; status: PlaySessionStatus };
  participants: Array<{
    userId: string;
    userName?: string;
    avatarUrl?: string | null;
    status: ParticipantStatus;
    currentDay: number | null;
    phase: string | null;
    score: number | null;
    deployedCount: number | null;
    completedAt: string | null;
  }>;
} | null> {
  const result = await requestJson<{
    playSession: { id: string; title: string; status: PlaySessionStatus };
    participants: Array<{
      userId: string;
      userName?: string;
      avatarUrl?: string | null;
      status: ParticipantStatus;
      currentDay: number | null;
      phase: string | null;
      score: number | null;
      deployedCount: number | null;
      completedAt: string | null;
    }>;
  }>(`/play-sessions/${playSessionId}/progress`);
  return result.data ?? null;
}
