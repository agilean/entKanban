export type AppConfig = {
  feishuAppId: string;
  feishuAppSecret: string;
  feishuRedirectUri: string;
  jwtSecret: string;
  webOrigin: string;
  cookieSecure: boolean;
  logAccessToken: string;
};

export function getConfig(): AppConfig {
  const externalUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  const webOrigin = process.env.WEB_ORIGIN ?? externalUrl ?? 'http://localhost:5173';
  const feishuRedirectUri =
    process.env.FEISHU_REDIRECT_URI ?? `${webOrigin}/api/auth/feishu/callback`;

  return {
    feishuAppId: process.env.FEISHU_APP_ID ?? '',
    feishuAppSecret: process.env.FEISHU_APP_SECRET ?? '',
    feishuRedirectUri,
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    webOrigin,
    cookieSecure: process.env.COOKIE_SECURE === 'true' || Boolean(externalUrl),
    logAccessToken: process.env.LOG_ACCESS_TOKEN ?? '',
  };
}
