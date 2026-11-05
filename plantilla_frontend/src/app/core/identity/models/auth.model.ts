import { OidcUserDto } from './dto/auth.dto';

/** Modelo mínimo compartido para el usuario autenticado. */
export type AuthenticatedUser = OidcUserDto;

export interface AuthStateModel {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthenticatedUser | null;
  error: string | null;
}
