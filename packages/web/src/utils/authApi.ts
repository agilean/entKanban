const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type AuthUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'member' | 'admin';
  orgId: string | null;
};

export type AuthOrg = {
  id: string;
  name: string;
};

export type MeResponse = {
  user: AuthUser;
  org: AuthOrg | null;
};

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; status: number; error?: string }> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);
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
  } catch {
    return { data: null, status: 0, error: 'Network error' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function startFeishuLogin(state?: string): void {
  const params = state ? `?state=${encodeURIComponent(state)}` : '';
  window.location.href = `${API_BASE}/auth/feishu/login${params}`;
}

export async function fetchMe(): Promise<MeResponse | null> {
  const result = await requestJson<MeResponse>('/auth/me');
  return result.data;
}

export async function logout(): Promise<boolean> {
  const result = await requestJson<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  return result.data?.ok === true;
}
