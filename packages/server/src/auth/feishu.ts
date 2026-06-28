import { getConfig } from '../config.js';

export type FeishuUserProfile = {
  feishuOpenId: string;
  feishuUnionId: string | null;
  name: string;
  avatarUrl: string | null;
};

export function buildFeishuAuthUrl(state?: string): string {
  const config = getConfig();
  const params = new URLSearchParams({
    client_id: config.feishuAppId,
    redirect_uri: config.feishuRedirectUri,
    response_type: 'code',
  });
  if (state) {
    params.set('state', state);
  }
  return `https://accounts.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
}

export async function exchangeCodeForUserProfile(code: string): Promise<FeishuUserProfile> {
  const config = getConfig();
  if (!config.feishuAppId || !config.feishuAppSecret) {
    throw new Error('Feishu OAuth is not configured');
  }

  const tokenResponse = await fetch(
    'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.feishuAppId}:${config.feishuAppSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
      }),
    },
  );

  const tokenPayload = (await tokenResponse.json()) as {
    code?: number;
    msg?: string;
    data?: { access_token?: string };
  };
  if (!tokenResponse.ok || tokenPayload.code !== 0 || !tokenPayload.data?.access_token) {
    throw new Error(tokenPayload.msg ?? 'Failed to exchange Feishu authorization code');
  }

  const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    headers: {
      Authorization: `Bearer ${tokenPayload.data.access_token}`,
    },
  });

  const userPayload = (await userResponse.json()) as {
    code?: number;
    msg?: string;
    data?: {
      open_id?: string;
      union_id?: string;
      name?: string;
      avatar_url?: string;
      en_name?: string;
    };
  };
  if (!userResponse.ok || userPayload.code !== 0 || !userPayload.data?.open_id) {
    throw new Error(userPayload.msg ?? 'Failed to fetch Feishu user profile');
  }

  return {
    feishuOpenId: userPayload.data.open_id,
    feishuUnionId: userPayload.data.union_id ?? null,
    name: userPayload.data.name ?? userPayload.data.en_name ?? 'Feishu User',
    avatarUrl: userPayload.data.avatar_url ?? null,
  };
}
