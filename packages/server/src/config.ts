export type AppConfig = {
  feishuAppId: string;
  feishuAppSecret: string;
  feishuRedirectUri: string;
  jwtSecret: string;
  webOrigin: string;
  cookieSecure: boolean;
};

export function getConfig(): AppConfig {
  return {
    feishuAppId: process.env.FEISHU_APP_ID ?? '',
    feishuAppSecret: process.env.FEISHU_APP_SECRET ?? '',
    feishuRedirectUri:
      process.env.FEISHU_REDIRECT_URI ?? 'http://localhost:5173/api/auth/feishu/callback',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  };
}
