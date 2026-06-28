import { getConfig } from '../config.js';
import { logError, logInfo } from '../logging.js';

export type FeishuUserProfile = {
  feishuOpenId: string;
  feishuUnionId: string | null;
  name: string;
  avatarUrl: string | null;
};

function isFeishuSuccessCode(code: number | string | undefined): boolean {
  return code === 0 || code === '0';
}

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

async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const config = getConfig();
  if (!config.feishuAppId || !config.feishuAppSecret) {
    throw new Error('Feishu OAuth is not configured');
  }

  const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.feishuAppId,
      client_secret: config.feishuAppSecret,
      code,
      redirect_uri: config.feishuRedirectUri,
    }),
  });

  const tokenPayload = (await tokenResponse.json()) as {
    code?: number | string;
    msg?: string;
    error?: string;
    error_description?: string;
    access_token?: string;
    data?: { access_token?: string };
  };

  const accessToken = tokenPayload.access_token ?? tokenPayload.data?.access_token;
  if (!tokenResponse.ok || !isFeishuSuccessCode(tokenPayload.code) || !accessToken) {
    logError('feishu.oauth', 'Token exchange failed (v2)', {
      status: tokenResponse.status,
      code: tokenPayload.code,
      msg: tokenPayload.msg,
      error: tokenPayload.error,
      errorDescription: tokenPayload.error_description,
      redirectUri: config.feishuRedirectUri,
    });
    throw new Error(
      tokenPayload.msg ??
        tokenPayload.error_description ??
        tokenPayload.error ??
        'Failed to exchange Feishu authorization code',
    );
  }

  logInfo('feishu.oauth', 'Access token obtained (v2)');
  return accessToken;
}

export async function exchangeCodeForUserProfile(code: string): Promise<FeishuUserProfile> {
  const accessToken = await exchangeCodeForAccessToken(code);

  const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const userPayload = (await userResponse.json()) as {
    code?: number | string;
    msg?: string;
    data?: {
      open_id?: string;
      union_id?: string;
      name?: string;
      avatar_url?: string;
      en_name?: string;
    };
  };
  if (!userResponse.ok || !isFeishuSuccessCode(userPayload.code) || !userPayload.data?.open_id) {
    logError('feishu.oauth', 'User info fetch failed', {
      status: userResponse.status,
      code: userPayload.code,
      msg: userPayload.msg,
    });
    throw new Error(userPayload.msg ?? 'Failed to fetch Feishu user profile');
  }

  logInfo('feishu.oauth', 'User profile fetched', {
    openIdPrefix: userPayload.data.open_id.slice(0, 8),
    name: userPayload.data.name ?? userPayload.data.en_name,
  });

  return {
    feishuOpenId: userPayload.data.open_id,
    feishuUnionId: userPayload.data.union_id ?? null,
    name: userPayload.data.name ?? userPayload.data.en_name ?? 'Feishu User',
    avatarUrl: userPayload.data.avatar_url ?? null,
  };
}
