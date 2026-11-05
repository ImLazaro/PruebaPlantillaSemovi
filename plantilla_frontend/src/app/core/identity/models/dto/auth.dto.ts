/**
 * Auth DTOs - Basados en Identity (secciones 1.1, 1.2 y 1.3 de API_SPECIFICATIONS.md)
 */

/**
 * Request de login
 */
export interface LoginRequestDto {
  username: string;
  password: string;
}

/**
 * Response de login exitoso
 */
export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // 'Bearer'
  expiresIn: number; // segundos
  user: LoginUserData;
}

export interface LoginUserData {
  id: string;
  username: string;
  email: string;
  mustChangePassword: boolean;
  roles?: string[];
}

/**
 * Request de refresh token (POST /oauth/token)
 * Payload x-www-form-urlencoded de referencia:
 * grant_type=refresh_token&refresh_token={refresh_token}&client_id={client_id}
 */
export interface RefreshTokenRequestDto {
  refreshToken: string;
}

/**
 * Response de refresh token
 */
export interface RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: LoginUserData;
}

/**
 * Parámetros del flujo de autorización OAuth (GET /oauth/authorize)
 */
export interface AuthorizeParams {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  nonce?: string; // Required when scope includes openid (OIDC)
  code_challenge?: string; // PKCE
  code_challenge_method?: 'S256';
}

/**
 * Request de intercambio de código por token (POST /oauth/token)
 * Payload de referencia para authorization_code:
 * grant_type=authorization_code&code={code}&redirect_uri={redirect_uri}&client_id={client_id}
 */
export interface TokenRequestDto {
  grant_type: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string; // para authorization_code
  redirect_uri?: string; // para authorization_code
  client_id: string;
  client_secret?: string; // para confidential clients
  code_verifier?: string; // PKCE
  refresh_token?: string; // para refresh_token grant
  scope?: string;
}

/**
 * Response de token OAuth
 */
export interface TokenResponseDto {
  access_token: string;
  token_type: string; // 'Bearer'
  expires_in: number; // segundos
  refresh_token?: string;
  scope?: string;
}

/**
 * Request de revocación de token (POST /oauth/revoke)
 * Payload x-www-form-urlencoded de referencia:
 * token={token}&token_type_hint=refresh_token
 */
export interface RevokeTokenRequestDto {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}

/**
 * Metadata OIDC del servidor de autorización (GET /.well-known/openid-configuration)
 */
export interface OAuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  token_endpoint_auth_methods_supported: string[];
  grant_types_supported: string[];
  response_types_supported: string[];
  scopes_supported: string[];
  code_challenge_methods_supported: string[];
}

/**
 * Contexto de autenticación actual
 */
export interface AuthContext {
  isAuthenticated: boolean;
  user: LoginUserData | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}

/**
 * PKCE Parameters
 */
export interface PkceParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/** Datos mínimos que el frontend necesita conservar después del login OIDC. */
export interface OidcRoleDto {
  [key: string]: unknown;
  id?: string;
  key?: string;
  name?: string;
  description?: string;
}

export interface OidcEmployeeDto {
  [key: string]: unknown;
  id?: string;
  firstName?: string;
  lastName?: string;
  secondLastName?: string;
  email?: string;
  employmentStatus?: string;
  isActive?: boolean;
  areaId?: string | null;
  instalacionId?: string | null;
  puestoId?: string | null;
  scheduleTypeId?: string | null;
  area?: { [key: string]: unknown; id?: string | null; name?: string; description?: string; level?: number | string; parentAreaId?: string | null };
  instalacion?: { [key: string]: unknown; id?: string | null; name?: string; code?: string; description?: string; street?: string };
  puesto?: { [key: string]: unknown; id?: string | null; name?: string; code?: string; description?: string; level?: number | string };
  scheduleType?: {
    id?: string;
    name?: string;
    code?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
    defaultWorkDays?: string;
    allowsFlexibleHours?: boolean;
    allows247Access?: boolean;
    isNightShift?: boolean;
    requiresSupervisorApproval?: boolean;
    [key: string]: unknown;
  };
}

/** Perfil local del usuario autenticado; no representa una entidad de negocio. */
export interface OidcUserDto {
  [key: string]: unknown;
  id: string;
  email: string;
  username?: string;
  isVerified?: boolean;
  isActive?: boolean;
  mustChangePassword?: boolean;
  lastLogin?: Date | string;
  lastPasswordChange?: Date | string;
  is2faEnabled?: boolean;
  twoFactorMethod?: '2fa' | 'sms' | 'whatsapp' | 'telegram';
  employee?: OidcEmployeeDto;
  role?: OidcRoleDto;
  roles?: OidcRoleDto[];
  permissions?: string[];
  effectivePermissions?: string[];
  permissionsByAudience?: Record<string, string[]>;
  rolesByAudience?: Record<string, Array<{ id: string; key: string; name: string }>>;
}
