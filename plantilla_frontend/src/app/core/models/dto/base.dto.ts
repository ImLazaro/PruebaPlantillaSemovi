/**
 * Base DTO - Entidad base con clave primaria UUID v7 (string).
 * Todas las entidades heredan de UuidBaseEntity en el backend.
 */
export interface BaseDto {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deleted: boolean;
  isActive: boolean;
}

/**
 * UuidBaseDto - Alias de BaseDto (todas las entidades usan UUID v7).
 */
export type UuidBaseDto = BaseDto;

/**
 * Response de paginación según Apéndice A de API_SPECIFICATIONS.md
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links?: PaginationLinks;
}

/**
 * Response estándar para recursos individuales
 */
export interface ApiResponse<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationLinks {
  self: string;
  first: string;
  last: string;
  next?: string;
  prev?: string;
}

/**
 * Parámetros de paginación estándar
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * Response de error estándar según sección 5.2 de API_SPECIFICATIONS.md
 */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

/**
 * Response genérico de operaciones exitosas
 */
export interface SuccessResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
