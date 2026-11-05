/**
 * Adaptador temporal hacia la implementación canónica en core/services.
 * Mantener hasta migrar todos los imports legados.
 */
export {
  BaseApiService,
  type RequestConfig,
  type PaginationParams,
  type ErrorResponse,
  type SuccessResponse,
  type LoadingState,
} from '@/app/core/services/base-api.service';
