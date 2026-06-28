import type { AuthOrg } from './authApi';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type OrgMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'member' | 'admin';
};

export type OrgDetails = {
  org: AuthOrg | null;
  role: 'member' | 'admin' | null;
  members: OrgMember[];
};

export type InvitationPreview = {
  token: string;
  orgName: string;
  status: 'pending' | 'accepted' | 'expired';
  expired: boolean;
  expiresAt: string;
};

export type CreatedInvitation = {
  token: string;
  expiresAt: string;
  inviteUrl: string;
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

export async function fetchMyOrg(): Promise<OrgDetails | null> {
  const result = await requestJson<OrgDetails>('/orgs/me');
  return result.data;
}

export async function createOrg(name: string): Promise<{ org: AuthOrg } | null> {
  const result = await requestJson<{ org: AuthOrg }>('/orgs', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return result.data;
}

export async function createInvitation(orgId: string): Promise<CreatedInvitation | null> {
  const result = await requestJson<{ invitation: CreatedInvitation }>(`/orgs/${orgId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.data?.invitation ?? null;
}

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const result = await requestJson<{ invitation: InvitationPreview }>(`/invitations/${token}`);
  return result.data?.invitation ?? null;
}

export async function acceptInvitation(token: string): Promise<{ org: AuthOrg } | null> {
  const result = await requestJson<{ org: AuthOrg }>(`/invitations/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.data;
}
