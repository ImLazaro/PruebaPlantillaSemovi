/**
 * =====================================================================
 * ENVIRONMENT CONFIGURATION - Local validation
 * =====================================================================
 */

const AUTH_SERVER_ROOT_URL = 'https://identity-api.localhost';
const AUTH_SERVER_BASE_URL = AUTH_SERVER_ROOT_URL;
const API_BASE_URL = 'https://api.localhost';

export const environment = {
  production: false,

  // =====================================================================
  // AUTH SERVER (SSO)
  // =====================================================================

  /** URL base del SSO (Auth Server) — con /api (JSON API endpoints) */
  ssoUrl: AUTH_SERVER_BASE_URL,
  /** URL raíz del SSO sin /api — para rutas de vistas (login, account, etc.) */
  ssoRootUrl: AUTH_SERVER_ROOT_URL,

  // =====================================================================
  // ERP API Gateway
  // =====================================================================

  /** URL base del gateway */
  apiUrl: API_BASE_URL,

  // =====================================================================
  // OAUTH 2.1 / OIDC CONFIGURATION
  // =====================================================================

  oauth: {
    /** Client ID registrado en el SSO */
    clientId: 'frontend-web',

    /** Audience objetivo del resource server para emisión de access token */
    audience: 'resource-api',

    /** URI de callback después de autenticación */
    redirectUri: 'https://frontend.localhost/auth/callback',

    /** Scopes solicitados */
    scopes: ['openid', 'profile', 'email', 'offline_access'],

    /**
     * Issuer esperado en los JWT emitidos por el SSO (campo `iss`).
     * Debe coincidir con JWT_ISSUER en el backend.
     */
    issuer: AUTH_SERVER_BASE_URL,

    // Endpoints OIDC del Auth Server
    endpoints: {
      /** OIDC Discovery */
      discovery: `${AUTH_SERVER_BASE_URL}/.well-known/openid-configuration`,
      
      /** Browser-redirect authorize endpoint — inicia el flujo OAuth redirect */
      authorize: `${AUTH_SERVER_ROOT_URL}/oauth/authorize`,

      /** Token endpoint — intercambio de código por tokens */
      token: `${AUTH_SERVER_BASE_URL}/oauth/token`,

      /** UserInfo endpoint — obtener perfil del usuario */
      userinfo: `${AUTH_SERVER_BASE_URL}/oauth/userinfo`,

      /** Revoke endpoint — revocar tokens */
      revoke: `${AUTH_SERVER_BASE_URL}/oauth/revoke`,

      /** JWKS endpoint — claves públicas */
      jwks: `${AUTH_SERVER_BASE_URL}/oauth/jwks`,

      /** PAR endpoint — parámetros de autorización enviados vía POST (RFC 9126) */
      par: `${AUTH_SERVER_BASE_URL}/oauth/par`,

      /** SSO logout — revoca tokens y limpia cookies HttpOnly en el servidor */
      clientLogout: `${AUTH_SERVER_BASE_URL}/oauth/client/logout`,
      ssoLogout: `${AUTH_SERVER_ROOT_URL}/oauth/sso/logout`
    },
    /** Habilita inicio automático del flujo de autenticación en la página pública */
    autoStartAuth: true,
  },

  // =====================================================================
  // DPoP — Demonstrating Proof of Possession (RFC 9449)
  // =====================================================================
  dpop: {
    /**
     * Habilita DPoP para binding criptográfico de tokens.
     * Requiere OAUTH_POP_MODE=dpop en el backend.
     * En desarrollo está deshabilitado hasta que el servidor esté configurado.
     */
    enabled: true,
  },
};
