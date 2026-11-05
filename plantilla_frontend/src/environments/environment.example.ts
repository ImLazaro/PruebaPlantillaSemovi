/**
 * Copia este archivo a environment.ts para configurar un entorno local.
 * No contiene secretos. Una aplicación SPA nunca debe incluir client secrets.
 */
const AUTH_SERVER_ROOT_URL = 'https://identity-api.example.test';
const AUTH_SERVER_BASE_URL = AUTH_SERVER_ROOT_URL;
const API_BASE_URL = 'https://api.example.test';

export const environment = {
  production: false,
  ssoUrl: AUTH_SERVER_BASE_URL,
  ssoRootUrl: AUTH_SERVER_ROOT_URL,
  apiUrl: API_BASE_URL,
  oauth: {
    clientId: 'frontend-web-local',
    audience: 'resource-api',
    redirectUri: 'https://frontend.example.test/auth/callback',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    issuer: AUTH_SERVER_BASE_URL,
    endpoints: {
      discovery: `${AUTH_SERVER_BASE_URL}/.well-known/openid-configuration`,
      authorize: `${AUTH_SERVER_ROOT_URL}/oauth/authorize`,
      token: `${AUTH_SERVER_BASE_URL}/oauth/token`,
      userinfo: `${AUTH_SERVER_BASE_URL}/oauth/userinfo`,
      revoke: `${AUTH_SERVER_BASE_URL}/oauth/revoke`,
      jwks: `${AUTH_SERVER_BASE_URL}/oauth/jwks`,
      par: `${AUTH_SERVER_BASE_URL}/oauth/par`,
      clientLogout: `${AUTH_SERVER_BASE_URL}/oauth/client/logout`,
      ssoLogout: `${AUTH_SERVER_ROOT_URL}/oauth/sso/logout`,
    },
    autoStartAuth: true,
  },
  dpop: { enabled: false },
};
