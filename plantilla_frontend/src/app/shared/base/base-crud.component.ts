/**
 * BaseCrudComponent - Componente base para operaciones CRUD
 * Proporciona funcionalidad común reutilizable para listados, creación, edición y eliminación
 */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';

import { 
  BaseApiService,
  NotificationService 
} from '../../core/services';

import { 
  PaginatedResponse,
  PaginationParams,
  SuccessResponse
} from '../../core/models/dto';

/**
 * Estado de paginación
 */
export interface PaginationState extends PaginationParams {
  page: number;
  limit: number;
  sort: string;
  order: 'ASC' | 'DESC';
}

/**
 * Estado de carga
 */
export interface LoadingStates {
  list: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  detail: boolean;
}

/**
 * Configuración del componente CRUD
 */
export interface CrudConfig {
  entityName: string; // Nombre singular de la entidad (ej: 'Usuario', 'Persona')
  entityNamePlural: string; // Nombre plural (ej: 'Usuarios', 'Personas')
  routePrefix: string; // Prefijo de ruta (ej: '/users', '/employees')
  defaultSort?: string; // Campo de ordenamiento por defecto
  defaultLimit?: number; // Límite por defecto
  enableSearch?: boolean; // Habilitar búsqueda
  enableFilters?: boolean; // Habilitar filtros
  enableExport?: boolean; // Habilitar exportación
  enableDelete?: boolean; // Habilitar eliminación
  enableCreate?: boolean; // Habilitar creación
  enableEdit?: boolean; // Habilitar edición
}

@Component({
  template: ''
})
export abstract class BaseCrudComponent<
  T,
  CreateDto = Partial<T>,
  UpdateDto = Partial<T>
> implements OnInit, OnDestroy {
  
  // ===================== PROPIEDADES ABSTRACTAS =====================
  
  /**
   * Servicio de la entidad - Debe ser implementado por las clases hijas
   */
  protected abstract service: BaseApiService<T, CreateDto, UpdateDto>;
  
  /**
   * Configuración del componente CRUD
   */
  protected abstract config: CrudConfig;

  // ===================== PROPIEDADES DE DATOS =====================
  
  /**
   * Lista de items
   */
  items: T[] = [];
  
  /**
   * Item seleccionado (para detalle/edición)
   */
  selectedItem: T | null = null;
  
  /**
   * Metadata de paginación
   */
  paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  };
  
  /**
   * Estado de paginación
   */
  paginationState: PaginationState = {
    page: 1,
    limit: 20,
    sort: 'id',
    order: 'ASC'
  };
  
  /**
   * Término de búsqueda
   */
  searchTerm: string = '';
  
  /**
   * Filtros activos
   */
  filters: Record<string, unknown> = {};

  // ===================== PROPIEDADES DE ESTADO =====================
  
  /**
   * Estados de carga
   */
  loading: LoadingStates = {
    list: false,
    create: false,
    update: false,
    delete: false,
    detail: false
  };
  
  /**
   * Subject para destrucción de observables
   */
  protected destroy$ = new Subject<void>();

  // ===================== CONSTRUCTOR =====================
  
  constructor(
    protected router: Router,
    protected route: ActivatedRoute,
    protected notificationService: NotificationService
  ) {}

  // ===================== LIFECYCLE HOOKS =====================
  
  ngOnInit(): void {
    // Aplicar configuración por defecto
    if (this.config.defaultSort) {
      this.paginationState.sort = this.config.defaultSort;
    }
    if (this.config.defaultLimit) {
      this.paginationState.limit = this.config.defaultLimit;
      this.paginationMeta.limit = this.config.defaultLimit;
    }
    
    // Cargar datos iniciales
    this.loadItems();
    
    // Hook personalizado
    this.onInit();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Hook personalizado
    this.onDestroy();
  }
  
  /**
   * Hook personalizado para inicialización
   * Puede ser sobrescrito por las clases hijas
   */
  protected onInit(): void {}
  
  /**
   * Hook personalizado para destrucción
   * Puede ser sobrescrito por las clases hijas
   */
  protected onDestroy(): void {}

  // ===================== OPERACIONES CRUD =====================
  
  /**
   * Cargar lista de items
   */
  loadItems(params?: Partial<PaginationParams>): void {
    this.loading.list = true;
    
    const requestParams = {
      ...this.paginationState,
      ...this.filters,
      ...params
    };
    
    this.service.getAll(requestParams)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.list = false)
      )
      .subscribe({
        next: (response: PaginatedResponse<T>) => {
          this.items = response.data;
          this.paginationMeta = response.meta;
          this.onItemsLoaded(response);
        },
        error: (error) => {
          this.handleError('cargar', error);
          this.onLoadError(error);
        }
      });
  }
  
  /**
   * Obtener item por ID
   */
  loadItemById(id: string): void {
    this.loading.detail = true;
    
    this.service.getById(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.detail = false)
      )
      .subscribe({
        next: (item: T) => {
          this.selectedItem = item;
          this.onItemLoaded(item);
        },
        error: (error) => {
          this.handleError('cargar', error);
          this.onLoadError(error);
        }
      });
  }
  
  /**
   * Crear item
   */
  createItem(data: CreateDto): void {
    if (!this.config.enableCreate) {
      return;
    }
    
    this.loading.create = true;
    
    this.service.create(data)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.create = false)
      )
      .subscribe({
        next: (item: T) => {
          this.notificationService.showSuccess(
            'Éxito',
            `${this.config.entityName} creado exitosamente`
          );
          this.onItemCreated(item);
          this.loadItems(); // Recargar lista
        },
        error: (error) => {
          this.handleError('crear', error);
          this.onCreateError(error);
        }
      });
  }
  
  /**
   * Actualizar item
   */
  updateItem(id: string, data: UpdateDto): void {
    if (!this.config.enableEdit) {
      return;
    }
    
    this.loading.update = true;
    
    this.service.update(id, data)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.update = false)
      )
      .subscribe({
        next: (item: T) => {
          this.notificationService.showSuccess(
            'Éxito',
            `${this.config.entityName} actualizado exitosamente`
          );
          this.onItemUpdated(item);
          this.loadItems(); // Recargar lista
        },
        error: (error) => {
          this.handleError('actualizar', error);
          this.onUpdateError(error);
        }
      });
  }
  
  /**
   * Eliminar item (soft delete)
   */
  deleteItem(id: string): void {
    if (!this.config.enableDelete) {
      return;
    }
    
    // Confirmar eliminación
    if (!confirm(`¿Está seguro de eliminar este ${this.config.entityName.toLowerCase()}?`)) {
      return;
    }
    
    this.loading.delete = true;
    
    this.service.delete(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.delete = false)
      )
      .subscribe({
        next: (response: SuccessResponse) => {
          this.notificationService.showSuccess(
            'Éxito',
            `${this.config.entityName} eliminado exitosamente`
          );
          this.onItemDeleted(id);
          this.loadItems(); // Recargar lista
        },
        error: (error) => {
          this.handleError('eliminar', error);
          this.onDeleteError(error);
        }
      });
  }

  // ===================== PAGINACIÓN =====================
  
  /**
   * Ir a la primera página
   */
  goToFirstPage(): void {
    if (this.paginationMeta.page > 1) {
      this.paginationState.page = 1;
      this.loadItems();
    }
  }
  
  /**
   * Ir a la página anterior
   */
  goToPreviousPage(): void {
    if (this.paginationMeta.hasPrev) {
      this.paginationState.page = this.paginationMeta.page - 1;
      this.loadItems();
    }
  }
  
  /**
   * Ir a la página siguiente
   */
  goToNextPage(): void {
    if (this.paginationMeta.hasNext) {
      this.paginationState.page = this.paginationMeta.page + 1;
      this.loadItems();
    }
  }
  
  /**
   * Ir a la última página
   */
  goToLastPage(): void {
    if (this.paginationMeta.page < this.paginationMeta.totalPages) {
      this.paginationState.page = this.paginationMeta.totalPages;
      this.loadItems();
    }
  }
  
  /**
   * Ir a una página específica
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.paginationMeta.totalPages && page !== this.paginationMeta.page) {
      this.paginationState.page = page;
      this.loadItems();
    }
  }
  
  /**
   * Cambiar límite de items por página
   */
  changeLimit(limit: number): void {
    if (limit !== this.paginationState.limit) {
      this.paginationState.limit = limit;
      this.paginationState.page = 1; // Resetear a primera página
      this.loadItems();
    }
  }
  
  /**
   * Cambiar ordenamiento
   */
  changeSort(sort: string, order: 'ASC' | 'DESC' = 'ASC'): void {
    this.paginationState.sort = sort;
    this.paginationState.order = order;
    this.loadItems();
  }

  // ===================== BÚSQUEDA Y FILTROS =====================
  
  /**
   * Buscar items
   */
  search(term: string): void {
    if (!this.config.enableSearch) {
      return;
    }
    
    this.searchTerm = term;
    this.paginationState.page = 1; // Resetear a primera página
    this.filters = { ...this.filters, search: term };
    this.loadItems();
  }
  
  /**
   * Aplicar filtros
   */
  applyFilters(filters: Record<string, unknown>): void {
    if (!this.config.enableFilters) {
      return;
    }
    
    this.filters = { ...filters };
    this.paginationState.page = 1; // Resetear a primera página
    this.loadItems();
  }
  
  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.filters = {};
    this.searchTerm = '';
    this.paginationState.page = 1;
    this.loadItems();
  }

  // ===================== NAVEGACIÓN =====================
  
  /**
   * Navegar a la vista de creación
   */
  navigateToCreate(): void {
    this.router.navigate([`${this.config.routePrefix}/create`]);
  }
  
  /**
   * Navegar a la vista de detalle
   */
  navigateToDetail(id: string): void {
    this.router.navigate([`${this.config.routePrefix}/${id}`]);
  }
  
  /**
   * Navegar a la vista de edición
   */
  navigateToEdit(id: string): void {
    this.router.navigate([`${this.config.routePrefix}/${id}/edit`]);
  }
  
  /**
   * Volver a la lista
   */
  navigateToList(): void {
    this.router.navigate([this.config.routePrefix]);
  }

  // ===================== MANEJO DE ERRORES =====================
  
  /**
   * Manejo centralizado de errores
   */
  protected handleError(operation: string, error: unknown): void {
    const err = error as { message?: string };
    const message = err.message || `Error al ${operation} ${this.config.entityName.toLowerCase()}`;
    this.notificationService.showError('Error', message);
  }

  // ===================== HOOKS PERSONALIZADOS =====================
  
  /**
   * Hook llamado después de cargar items
   */
  protected onItemsLoaded(response: PaginatedResponse<T>): void {}
  
  /**
   * Hook llamado después de cargar un item
   */
  protected onItemLoaded(item: T): void {}
  
  /**
   * Hook llamado después de crear un item
   */
  protected onItemCreated(item: T): void {}
  
  /**
   * Hook llamado después de actualizar un item
   */
  protected onItemUpdated(item: T): void {}
  
  /**
   * Hook llamado después de eliminar un item
   */
  protected onItemDeleted(id: string): void {}
  
  /**
   * Hook llamado en error de carga
   */
  protected onLoadError(error: unknown): void {}
  
  /**
   * Hook llamado en error de creación
   */
  protected onCreateError(error: unknown): void {}
  
  /**
   * Hook llamado en error de actualización
   */
  protected onUpdateError(error: unknown): void {}
  
  /**
   * Hook llamado en error de eliminación
   */
  protected onDeleteError(error: unknown): void {}

  // ===================== UTILIDADES =====================
  
  /**
   * Verificar si hay items
   */
  get hasItems(): boolean {
    return this.items && this.items.length > 0;
  }
  
  /**
   * Verificar si se está cargando algo
   */
  get isLoading(): boolean {
    return Object.values(this.loading).some(state => state === true);
  }
  
  /**
   * Verificar si hay página siguiente
   */
  get hasNextPage(): boolean {
    return this.paginationMeta.hasNext;
  }
  
  /**
   * Verificar si hay página anterior
   */
  get hasPreviousPage(): boolean {
    return this.paginationMeta.hasPrev;
  }
  
  /**
   * Obtener número de página actual
   */
  get currentPage(): number {
    return this.paginationMeta.page;
  }
  
  /**
   * Obtener total de páginas
   */
  get totalPages(): number {
    return this.paginationMeta.totalPages;
  }
  
  /**
   * Obtener total de items
   */
  get totalItems(): number {
    return this.paginationMeta.total;
  }
  
  /**
   * Generar array de números de página para paginador
   */
  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2; // Páginas a mostrar a cada lado de la actual
    
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    
    if (current - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }
    
    rangeWithDots.push(...range);
    
    if (current + delta < total - 1) {
      rangeWithDots.push('...', total);
    } else if (total > 1) {
      rangeWithDots.push(total);
    }
    
    return rangeWithDots.filter(n => typeof n === 'number') as number[];
  }
}
