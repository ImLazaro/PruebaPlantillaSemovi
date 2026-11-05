import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { 
  PaginatedResponse, 
  PaginationParams, 
  ErrorResponse,
  SuccessResponse 
} from '../models/dto';
import { environment } from '../../../environments/environment';
import { QueryBuilder, FilterObject } from '../../shared/lib/utils/query-builder.util';

/**
 * Configuración de petición HTTP
 */
export interface RequestConfig {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | QueryParams;
  observe?: 'body';
  reportProgress?: boolean;
  withCredentials?: boolean;
}

export type QueryParamPrimitive = string | number | boolean;
export type QueryParamValue =
  | QueryParamPrimitive
  | QueryParamPrimitive[]
  | null
  | undefined;
export type QueryParams = Record<string, QueryParamValue>;

/**
 * Estado de carga del servicio
 */
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
}

/**
 * BaseApiService - Servicio base para todas las peticiones HTTP
 * Proporciona métodos reutilizables para operaciones CRUD
 * 
 * DYNAMIC FILTERING:
 * Use the 'filters' property in params to pass filter objects.
 * Filters will be automatically converted to bracket notation compatible with backend.
 * 
 * Example:
 * ```
 * this.getAll({ 
 *   page: 1, 
 *   limit: 10,
 *   filters: { nombre: 'Juan', activo: true, edad: { gte: 18 } }
 * })
 * // Generates: nombre[like]=%Juan%&activo[eq]=true&edad[gte]=18&page=1&limit=10
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export abstract class BaseApiService<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  /**
   * URL base de la API (sin barra final)
   */
  protected readonly apiUrl: string = environment.apiUrl;

  /**
   * Endpoint del recurso (ej: '/users', '/hr/employees')
   * Debe ser implementado por las clases hijas
   */
  protected abstract readonly endpoint: string;

  /**
   * Estado de carga observable
   */
  protected loadingSubject = new BehaviorSubject<LoadingState>({ isLoading: false });
  public loading$ = this.loadingSubject.asObservable();

  constructor(protected http: HttpClient) {}

  /**
   * Construye la URL completa del endpoint
   */
  protected buildUrl(path: string = ''): string {
    const cleanEndpoint = this.endpoint.startsWith('/') ? this.endpoint : `/${this.endpoint}`;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${cleanEndpoint}${path ? cleanPath : ''}`;
  }

  /**
   * Construye HttpParams desde un objeto
   * Preserva parámetros con operadores como: field[eq], field[like], etc.
   * Automatically processes 'filters' property using QueryBuilder
   */
  protected buildParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    
    if (!params) {
      return httpParams;
    }

    // Extract filters if present
    const { filters, ...otherParams } = params;
    
    // Process filters using QueryBuilder if provided
    let processedParams: QueryParams = { ...otherParams };
    
    if (filters && typeof filters === 'object') {
      const filterParams = QueryBuilder.buildQueryParams(filters as unknown as FilterObject);
      processedParams = { ...filterParams, ...otherParams };
    }
    
    // Build HttpParams from processed parameters
    Object.keys(processedParams).forEach(key => {
      const value = processedParams[key];
      
      // Skip undefined y null
      if (value === null || value === undefined) {
        return;
      }
      
      // Skip strings vacías SOLO si NO es un parámetro con operador
      // Los parámetros con operadores como 'field[eq]' deben preservarse
      if (typeof value === 'string' && value === '' && !key.includes('[')) {
        return;
      }
      
      if (Array.isArray(value)) {
        // Para arrays, agregar múltiples valores para la misma key
        value.forEach(item => {
          if (item !== null && item !== undefined) {
            httpParams = httpParams.append(key, item.toString());
          }
        });
      } else {
        // Agregar el parámetro normalmente
        httpParams = httpParams.set(key, value.toString());
      }
    });
    
    return httpParams;
  }

  /**
   * Marca el inicio de una operación de carga
   */
  protected startLoading(operation?: string): void {
    this.loadingSubject.next({ isLoading: true, operation });
  }

  /**
   * Marca el fin de una operación de carga
   */
  protected stopLoading(): void {
    this.loadingSubject.next({ isLoading: false });
  }

  /**
   * Maneja errores HTTP de forma estandarizada
   */
  protected handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Error del cliente o de red
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del backend
      const backendError = error.error as ErrorResponse;
      
      if (backendError && backendError.message) {
        if (Array.isArray(backendError.message)) {
          errorMessage = backendError.message.join(', ');
        } else {
          errorMessage = backendError.message;
        }
      } else {
        switch (error.status) {
          case 400:
            errorMessage = 'Solicitud incorrecta. Verifique los datos enviados';
            break;
          case 401:
            errorMessage = 'No autorizado. Por favor, inicie sesión nuevamente';
            break;
          case 403:
            errorMessage = 'No tiene permisos para realizar esta acción';
            break;
          case 404:
            errorMessage = 'Recurso no encontrado';
            break;
          case 409:
            errorMessage = 'El recurso ya existe o hay un conflicto';
            break;
          case 422:
            errorMessage = 'Error de validación en los datos enviados';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            break;
          default:
            errorMessage = `Error del servidor (${error.status}): ${error.statusText}`;
        }
      }
    }
    
    return throwError(() => ({ message: errorMessage, status: error.status, details: error.error }));
  }

  // ===================== MÉTODOS CRUD BÁSICOS =====================

  /**
   * GET - Obtener lista paginada de recursos
   * @param params Parámetros de paginación y filtros
   */
  getAll(params?: PaginationParams & QueryParams): Observable<PaginatedResponse<T>> {
    this.startLoading('getAll');
    
    return this.http.get<PaginatedResponse<T>>(this.buildUrl(), {
      params: this.buildParams(params)
    }).pipe(
      tap(() => this.stopLoading()),
      catchError(error => {
        this.stopLoading();
        return this.handleError(error);
      })
    );
  }

  /**
   * GET - Obtener un recurso por ID
   * @param id ID del recurso
   */
  getById(id: string): Observable<T> {
    this.startLoading('getById');
    
    return this.http.get<T>(this.buildUrl(`/${id}`)).pipe(
      tap(() => this.stopLoading()),
      catchError(error => {
        this.stopLoading();
        return this.handleError(error);
      })
    );
  }

  /**
   * POST - Crear un nuevo recurso
   * @param data Datos de creación
   */
  create(data: CreateDto): Observable<T> {
    this.startLoading('create');
    
    return this.http.post<T>(this.buildUrl(), data).pipe(
      tap(() => this.stopLoading()),
      catchError(error => {
        this.stopLoading();
        return this.handleError(error);
      })
    );
  }

  /**
   * PATCH - Actualizar un recurso existente
   * @param id ID del recurso
   * @param data Datos de actualización
   */
  update(id: string, data: UpdateDto): Observable<T> {
    this.startLoading('update');
    
    return this.http.patch<T>(this.buildUrl(`/${id}`), data).pipe(
      tap(() => this.stopLoading()),
      catchError(error => {
        this.stopLoading();
        return this.handleError(error);
      })
    );
  }

  /**
   * DELETE - Eliminar un recurso (soft delete)
   * @param id ID del recurso
   */
  delete(id: string): Observable<SuccessResponse> {
    this.startLoading('delete');
    
    return this.http.delete<SuccessResponse>(this.buildUrl(`/${id}`)).pipe(
      tap(() => this.stopLoading()),
      catchError(error => {
        this.stopLoading();
        return this.handleError(error);
      })
    );
  }

  // ===================== MÉTODOS AUXILIARES =====================

  /**
   * GET - Petición GET personalizada
   */
  protected get<R>(path: string, params?: QueryParams): Observable<R> {
    return this.http.get<R>(this.buildUrl(path), {
      params: this.buildParams(params)
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * POST - Petición POST personalizada
   */
  protected post<R>(
    path: string,
    body: unknown,
    params?: QueryParams,
  ): Observable<R> {
    return this.http.post<R>(this.buildUrl(path), body, {
      params: this.buildParams(params)
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * PATCH - Petición PATCH personalizada
   */
  protected patch<R>(
    path: string,
    body: unknown,
    params?: QueryParams,
  ): Observable<R> {
    return this.http.patch<R>(this.buildUrl(path), body, {
      params: this.buildParams(params)
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * PUT - Petición PUT personalizada
   */
  protected put<R>(
    path: string,
    body: unknown,
    params?: QueryParams,
  ): Observable<R> {
    return this.http.put<R>(this.buildUrl(path), body, {
      params: this.buildParams(params)
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * DELETE - Petición DELETE personalizada
   */
  protected deleteCustom<R>(path: string, params?: QueryParams): Observable<R> {
    return this.http.delete<R>(this.buildUrl(path), {
      params: this.buildParams(params)
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }
}
