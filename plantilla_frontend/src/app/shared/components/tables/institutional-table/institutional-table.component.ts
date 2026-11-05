import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, AfterContentInit, AfterViewInit, ViewChildren, ElementRef, QueryList, ChangeDetectorRef, HostListener, OnChanges, SimpleChanges, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingModalComponent } from '@/app/shared/components/modals/loading-modal/loading-modal.component';
import {
  applyLocalSortState,
  buildSelectAllChangeEvent,
  buildSelectionChangeEvent,
  buildWidthMapFromHeaderCells,
  computeSelectionState,
  computeStickyOffsets,
  getNestedProperty,
  getNextSortState,
  resolveDisplayData,
  toggleSelectedItem
} from './institutional-table.utils';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  maxWidth?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  template?: TemplateRef<unknown>;
  /** Pin column during horizontal scroll. Use 'left' or 'right' to pin to that side. */
  pin?: 'left' | 'right';
}

export interface TableConfig {
  variant?: 'default' | 'compact' | 'dense' | 'spacious';
  striped?: boolean;
  hoverable?: boolean;
  responsive?: boolean;
  fixedHeader?: boolean;
  stickyHeader?: boolean;
  selectable?: boolean;
  expandable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  localSort?: boolean; // Si es true, ordena localmente; si es false, emite evento para ordenamiento del servidor
}

export interface SortEvent {
  column: string | null;
  direction: 'asc' | 'desc' | null;
}

export interface SelectionEvent {
  selectedItems: Record<string, unknown>[];
  allSelected: boolean;
}

@Component({
  selector: 'app-institutional-table',
  standalone: true,
  imports: [CommonModule, LoadingModalComponent],
  styleUrls: ['./institutional-table.component.css'],
  encapsulation: ViewEncapsulation.None,
  template: `
      <!-- Modal de carga usando el componente dedicado -->
      <app-loading-modal
        [isOpen]="config.loading || false"
        [config]="{
          title: 'Cargando datos',
          message: 'Obteniendo información de la tabla...',
          size: 'md',
          preventClose: true
        }">
      </app-loading-modal>

      <div 
        class="institucional-table-responsive"
        [class.institucional-table-fixed-header]="config.fixedHeader">
        
          <table 
          class="institucional-table"
          [class.institucional-table-sticky]="config.stickyHeader"
          [class.institucional-table-compact]="config.variant === 'compact'"
          [class.institucional-table-dense]="config.variant === 'dense'"
          [class.institucional-table-spacious]="config.variant === 'spacious'"
          [class.has-sticky-columns]="hasStickyColumns">
          
          <thead>
            <tr>
              <th *ngIf="config.selectable" class="institucional-table-header">
                <input 
                  type="checkbox" 
                  class="institucional-table-checkbox"
                  [checked]="allSelected"
                  [indeterminate]="someSelected && !allSelected"
                  (change)="toggleSelectAll($event)">
              </th>
              
              <th 
                *ngFor="let column of columns; let i = index" 
                #colHeader
                [attr.data-col-index]="i"
                class="institucional-table-header"
                [class.institucional-table-sortable]="column.sortable"
                [class.institucional-table-sort-asc]="sortColumn === column.key && sortDirection === 'asc'"
                [class.institucional-table-sort-desc]="sortColumn === column.key && sortDirection === 'desc'"
                [class.institucional-table-column-sticky-left]="column.pin === 'left'"
                [class.institucional-table-column-sticky-right]="column.pin === 'right'"
                [style.left.px]="column.pin !== 'left' ? null : leftOffsets[i]"
                [style.right.px]="column.pin !== 'right' ? null : 0"
                [style.width]="column.width ? column.width : null"
                [style.max-width]="column.maxWidth ? column.maxWidth : null"
                [style.min-width]="column.minWidth ? column.minWidth : null"
                [style.text-align]="column.align || 'left'"
                (click)="onSort(column)">
                
                <div class="header-content">
                  <span class="column-title">{{ column.label }}</span>
                  <span 
                    *ngIf="column.sortable" 
                    class="institucional-table-sort-icon material-symbols-outlined">
                    {{ getSortIcon(column.key) }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            <tr 
              *ngFor="let item of displayData; let i = index; trackBy: trackByFn"
              class="institucional-table-row"
              [class.institucional-table-row-selected]="isSelected(item)"
              [class.institucional-table-row-striped]="config.striped"
              [class.institucional-table-expandable-row]="config.expandable"
              (click)="onRowClick(item, i)">
              
              <td *ngIf="config.selectable" class="institucional-table-cell">
                <input 
                  type="checkbox" 
                  class="institucional-table-checkbox"
                  [checked]="isSelected(item)"
                  (change)="toggleSelect(item, $event)"
                  (click)="$event.stopPropagation()">
              </td>
              
              <td 
                *ngFor="let column of columns; let ci = index" 
                class="institucional-table-cell"
                [class.institucional-table-column-sticky-left]="column.pin === 'left'"
                [class.institucional-table-column-sticky-right]="column.pin === 'right'"
                [style.left.px]="column.pin !== 'left' ? null : leftOffsets[ci]"
                [style.right.px]="column.pin !== 'right' ? null : 0"
                [style.width]="column.width ? column.width : null"
                [style.max-width]="column.maxWidth ? column.maxWidth : null"
                [style.text-align]="column.align || 'left'">
                
                <div *ngIf="column.template; else defaultCell" class="cell-content">
                  <ng-container 
                    *ngTemplateOutlet="column.template; context: { $implicit: item, column: column, index: i }">
                  </ng-container>
                </div>
                
                <ng-template #defaultCell>
                  <div class="cell-content">{{ getCellValue(item, column) }}</div>
                </ng-template>
              </td>
            </tr>
            
            <ng-container *ngIf="config.expandable">
              <tr *ngFor="let expandedItem of displayData; trackBy: trackByFn">
                <td *ngIf="isExpanded(expandedItem)"
                    [attr.colspan]="getTotalColumns()"
                    class="institucional-table-expanded-content">
                  <ng-content select="[slot=expanded]"></ng-content>
                </td>
              </tr>
            </ng-container>
            
            <tr *ngIf="displayData.length === 0 && !config.loading" class="institucional-table-row">
              <td [attr.colspan]="getTotalColumns()" class="institucional-table-empty">
                <div class="institucional-table-empty-icon material-symbols-outlined">
                  {{ config.emptyIcon || 'table_view' }}
                </div>
                <div class="institucional-table-empty-title">
                  Sin datos disponibles
                </div>
                <div class="institucional-table-empty-description">
                  {{ config.emptyMessage || 'No hay información para mostrar en este momento.' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  `
})
export class InstitutionalTableComponent implements AfterContentInit, AfterViewInit, OnChanges, OnDestroy {
  constructor(private cd: ChangeDetectorRef) {
    // Inicializar arrays para evitar problemas de referencia
    this.originalData = [];
    this.sortedData = [];
  }
  @Input() data: unknown[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() config: TableConfig = {};
  @Input() selectedItems: unknown[] = [];
  @Input() expandedItems: unknown[] = [];
  @Input() sortColumn: string | null = '';
  @Input() sortDirection: 'asc' | 'desc' | null = null;

  @Output() sort = new EventEmitter<SortEvent>();
  @Output() selectionChange = new EventEmitter<SelectionEvent>();
  @Output() rowClick = new EventEmitter<{ item: unknown; index: number }>();
  @Output() expandToggle = new EventEmitter<{ item: unknown; expanded: boolean }>();

  @ContentChild('actions') actionsTemplate?: TemplateRef<unknown>;
  @ContentChild('expanded') expandedTemplate?: TemplateRef<unknown>;

  @ViewChildren('colHeader', { read: ElementRef }) headerCells!: QueryList<ElementRef>;

  leftOffsets: { [key: number]: number } = {};
  rightOffsets: { [key: number]: number } = {};
  private stickyScrollContainer: HTMLElement | null = null;
  private readonly stickyScrollHandler = (): void => {
    const stickyHeaders = document.querySelectorAll('.institucional-table-column-sticky-right');
    stickyHeaders.forEach((element: Element) => (element as HTMLElement).style.right = '0');
  };
  
  // Para ordenamiento local
  private originalData: Record<string, unknown>[] = [];
  sortedData: Record<string, unknown>[] = [];

  get hasStickyColumns(): boolean {
    return this.columns.some(col => col.pin === 'left' || col.pin === 'right');
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambiaron los datos, actualizar datos originales y aplicar ordenamiento
    if (changes['data'] && changes['data'].currentValue) {
      this.originalData = [...(changes['data'].currentValue as Record<string, unknown>[])];
      this.applySortIfLocal();
      
      // Re-aplicar sticky positioning cuando cambien los datos de la tabla
      if (!changes['data'].firstChange) {
        setTimeout(() => {
          this.computeStickyOffsets();
          this.enforceStickyPositioning();
        }, 50);
      }
    }
    
    // Si cambió el ordenamiento externo y está en modo local, aplicar ordenamiento
    if ((changes['sortColumn'] || changes['sortDirection']) && this.config.localSort) {
      this.applySortIfLocal();
    }
    
    // Si cambió la configuración, re-aplicar ordenamiento
    if (changes['config'] && this.config.localSort) {
      this.applySortIfLocal();
    }
  }

  ngAfterContentInit() {
    // Actions are now handled via column configuration
  }

  ngAfterViewInit() {
    // Wait a tick for DOM to settle
    setTimeout(() => {
      this.computeStickyOffsets();
      this.enforceStickyPositioning();
    }, 0);
  }

  @HostListener('window:resize')
  onWindowResize() {
    // recompute offsets on resize
    this.computeStickyOffsets();
    this.enforceStickyPositioning();
  }

  /**
   * Force sticky positioning for browsers that might ignore CSS sticky
   */
  private enforceStickyPositioning() {
    if (!this.hasStickyColumns) return;

    const tableContainer = document.querySelector('.institucional-table-responsive') as HTMLElement;
    const stickyHeaders = document.querySelectorAll('.institucional-table-column-sticky-right');
    
    if (!tableContainer || !stickyHeaders.length) return;

    // Force the sticky positioning with JavaScript
    stickyHeaders.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.position = 'sticky';
      htmlElement.style.right = '0';
      // Solo aplicar z-index a los <th> (headers). Los <td> con z-index crean un
      // stacking context que bloquea los clicks a elementos position:fixed (dropdowns)
      if (htmlElement.tagName.toLowerCase() === 'th') {
        htmlElement.style.zIndex = '2';
        htmlElement.style.backgroundColor = 'var(--institucional-primario)';
      } else {
        htmlElement.style.zIndex = '';
        htmlElement.style.backgroundColor = 'white';
      }
    });

    if (this.stickyScrollContainer !== tableContainer) {
      this.stickyScrollContainer?.removeEventListener('scroll', this.stickyScrollHandler);
      this.stickyScrollContainer = tableContainer;
      this.stickyScrollContainer.addEventListener('scroll', this.stickyScrollHandler, { passive: true });
    }
  }

  ngOnDestroy(): void {
    this.stickyScrollContainer?.removeEventListener('scroll', this.stickyScrollHandler);
    this.stickyScrollContainer = null;
  }

  private computeStickyOffsets() {
    if (!this.headerCells || !this.columns) return;

    // Map header elements by data-col-index
    const widthMap = buildWidthMapFromHeaderCells(
      this.headerCells.map(el => el.nativeElement as HTMLElement)
    );

    const { leftOffsets, rightOffsets } = computeStickyOffsets(this.columns, widthMap);
    this.leftOffsets = leftOffsets;
    this.rightOffsets = rightOffsets;

    // trigger change detection in case bindings need to update
    try { this.cd.detectChanges(); } catch (e) { /* ignore */ }
  }

  get allSelected(): boolean {
    return computeSelectionState(this.selectedItems, this.displayData).allSelected;
  }

  get someSelected(): boolean {
    return computeSelectionState(this.selectedItems, this.displayData).someSelected;
  }

  trackByFn(index: number, item: Record<string, unknown>): unknown {
    return item['id'] ?? index;
  }

  isSelected(item: Record<string, unknown>): boolean {
    return this.selectedItems.includes(item);
  }

  isExpanded(item: Record<string, unknown>): boolean {
    return this.expandedItems.includes(item);
  }

  toggleSelect(item: Record<string, unknown>, event: Event): void {
    event.stopPropagation();
    const newSelection = toggleSelectedItem(this.selectedItems, item);

    this.selectionChange.emit(buildSelectionChangeEvent({
      selectedItems: newSelection,
      totalItems: this.data.length
    }));
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectionChange.emit(buildSelectAllChangeEvent(target.checked, this.displayData));
  }

  onSort(column: TableColumn): void {
    if (!column.sortable) return;

    const { column: newColumn, direction: newDirection } = getNextSortState(this.sortColumn, this.sortDirection, column.key);

    // Actualizar estado de ordenamiento
    this.sortColumn = newColumn;
    this.sortDirection = newDirection;

    // Si está habilitado el ordenamiento local, ordenar los datos internamente
    if (this.config.localSort) {
      this.applySortIfLocal();
      // Forzar detección de cambios para actualizar la vista
      this.cd.detectChanges();
    }
    
    // Siempre emitir el evento para mantener sincronización con el componente padre
    this.sort.emit({
      column: newColumn,
      direction: newDirection
    });
  }

  /**
   * Aplica ordenamiento local a los datos si está habilitado
   */
  private applySortIfLocal(): void {
    this.sortedData = applyLocalSortState({
      localSort: this.config.localSort,
      originalData: this.originalData,
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection
    });
  }

  /**
   * Obtener los datos que se deben mostrar (ordenados si está habilitado el modo local)
   */
  get displayData(): Record<string, unknown>[] {
    return resolveDisplayData({
      localSort: this.config.localSort,
      sortedData: this.sortedData,
      originalData: this.originalData,
      inputData: (this.data as Record<string, unknown>[]) || []
    });
  }

  onRowClick(item: Record<string, unknown>, index: number): void {
    if (this.config.expandable) {
      this.toggleExpanded(item);
    }
    
    this.rowClick.emit({ item, index });
  }

  toggleExpanded(item: Record<string, unknown>): void {
    const isExpanded = this.isExpanded(item);
    this.expandToggle.emit({ item, expanded: !isExpanded });
  }

  getSortIcon(columnKey: string): string {
    if (this.sortColumn !== columnKey || this.sortDirection === null) {
      return 'unfold_more';
    }
    return this.sortDirection === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  getCellValue(item: Record<string, unknown>, column: TableColumn): unknown {
    const value = this.getNestedProperty(item, column.key);
    
    switch (column.type) {
      case 'date':
        if (!value) return '';
        const d = new Date(value as string);
        if (isNaN(d.getTime())) return value;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      case 'boolean':
        return value ? 'Sí' : 'No';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString('es-ES') : value;
      default:
        return value ?? '';
    }
  }

  private getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
    return getNestedProperty(obj, path);
  }

  getTotalColumns(): number {
    let count = this.columns.length;
    if (this.config.selectable) count++;
    // Actions are now included in the columns array, not separately
    return count;
  }
}
