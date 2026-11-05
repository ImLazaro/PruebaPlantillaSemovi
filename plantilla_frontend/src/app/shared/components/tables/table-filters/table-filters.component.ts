import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { InputEnhancedComponent } from '../../inputs/input-enhanced/input-enhanced.component';
import { SelectComponent, SelectOption } from '../../inputs/select/select.component';
import { InstitutionalButtonComponent } from '../../buttons/institutional-button/institutional-button.component';
import { CompactDateInputComponent } from '../../date-pickers/compact-date-input/compact-date-input.component';
import {
  ExportService, ExportColumnDef,
  EnhancedExportService, ExportDocConfig,
  ExportFormat, ExportFormatDescriptor, ALL_EXPORT_FORMAT_DESCRIPTORS,
} from '../../../lib/export';
import { ExportEvent, ExportConfig, ExportFormat as LegacyExportFormat } from '../table-export/table-export.component';

export type { ExportColumnDef };

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'daterange' | 'select' | 'boolean';
  placeholder?: string;
  options?: SelectOption[];
  multiple?: boolean;
  width?: string;
  queryParam?: string; // Parámetro personalizado para el API (ej: 'name[like]', 'status[eq]')
}

export interface FilterValue {
  [key: string]: unknown;
}

@Component({
  selector: 'app-table-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputEnhancedComponent, SelectComponent, InstitutionalButtonComponent, CompactDateInputComponent],
  template: `
    <div class="institucional-table-filters">

      <!-- ── Fila principal: búsqueda + filtros específicos + acciones ── -->
      <div class="w-full flex items-center justify-between gap-4 flex-wrap">

        <!-- ── Izquierda: búsqueda global + filtros específicos ── -->
        <div class="flex flex-wrap items-center gap-3">

          <!-- Búsqueda global -->
          <div *ngIf="showGlobalSearch">
            <app-input-enhanced
              [control]="globalSearchControl"
              [label]="'Búsqueda global'"
              [placeholder]="globalSearchPlaceholder || 'Buscar...'"
              [iconLeft]="'search'"
              [iconLeftType]="'material'"
              [variant]="'outlined'"
              [floating]="true"
              [size]="'md'"
              [fullWidth]="false"
              [width]="'280px'">
            </app-input-enhanced>
          </div>

          <!-- Filtros específicos -->
          <form [formGroup]="filterForm" class="flex flex-wrap items-center gap-3">
          <div
            *ngFor="let filter of filters; trackBy: trackFilter"
            [style.width]="filter.width || 'auto'">

            <app-input-enhanced
              *ngIf="filter.type === 'text'"
              [control]="getFilterControl(filter.key)"
              [label]="filter.label"
              [placeholder]="filter.placeholder || ''"
              [variant]="'outlined'"
              [floating]="true"
              [size]="'md'"
              [width]="filter.width || 'auto'">
            </app-input-enhanced>

            <app-input-enhanced
              *ngIf="filter.type === 'number'"
              [control]="getFilterControl(filter.key)"
              [label]="filter.label"
              [type]="'number'"
              [placeholder]="filter.placeholder || ''"
              [variant]="'outlined'"
              [floating]="true"
              [size]="'md'"
              [width]="filter.width || 'auto'">
            </app-input-enhanced>

            <app-compact-date-input
              *ngIf="filter.type === 'date'"
              [controlName]="filter.key"
              [label]="filter.label"
              [floating]="true"
              [size]="'md'"
              [width]="filter.width">
            </app-compact-date-input>

            <app-select
              *ngIf="filter.type === 'select'"
              [control]="getFilterControl(filter.key)"
              [label]="filter.label"
              [placeholder]="filter.placeholder || 'Todos'"
              [options]="filter.options || []"
              [allowEmpty]="true"
              [variant]="'outlined'"
              [floating]="true"
              [size]="'md'"
              [width]="filter.width || 'auto'">
            </app-select>

            <app-select
              *ngIf="filter.type === 'boolean'"
              [control]="getFilterControl(filter.key)"
              [label]="filter.label"
              [placeholder]="'Todos'"
              [options]="getBooleanOptions()"
              [allowEmpty]="true"
              [variant]="'outlined'"
              [size]="'md'"
              [floating]="true"
              [width]="filter.width || 'auto'">
            </app-select>

            <div *ngIf="filter.type === 'daterange'" class="flex gap-2">
              <app-compact-date-input
                [controlName]="filter.key + '_from'"
                [label]="filter.label + ' (Desde)'"
                [floating]="true"
                [size]="'md'">
              </app-compact-date-input>
              <app-compact-date-input
                [controlName]="filter.key + '_to'"
                [label]="filter.label + ' (Hasta)'"
                [floating]="true"
                [size]="'md'">
              </app-compact-date-input>
            </div>
          </div>
        </form>
        </div><!-- /izquierda -->

        <!-- ── Derecha: acciones ── -->
        <div class="ml-auto flex items-center gap-2 shrink-0">
          <app-institutional-button
            *ngIf="showAdvancedFiltersButton"
            [config]="{ variant: 'secondary', icon: 'tune' }"
            title="Filtros avanzados"
            (clicked)="toggleAdvancedFilters()">
            Filtros avanzados
          </app-institutional-button>

          <!-- Botón exportar -->
          @if (showExport) {
            <div class="relative"
                 [class.opacity-40]="isLoading || exportData.length === 0 || exportState === 'loading'"
                 [class.pointer-events-none]="isLoading || exportData.length === 0 || exportState === 'loading'">
              <!-- Toast de feedback -->
              @if (exportState === 'success') {
                <div class="export-toast export-toast--success">✓ Descargado</div>
              }
              @if (exportState === 'error') {
                <div class="export-toast export-toast--error">✕ Error al exportar</div>
                @if (exportError) {
                  <div class="absolute right-0 top-full mt-1 z-50 max-w-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-md whitespace-normal">
                    {{ exportError }}
                  </div>
                }
              }
              <app-institutional-button
                [config]="{ variant: 'primary', icon: exportState === 'loading' ? 'hourglass_top' : 'download' }"
                (clicked)="toggleExportMenu()">
                {{ exportState === 'loading' ? 'Exportando…' : 'Exportar' }}
              </app-institutional-button>

              <!-- Dropdown de formatos -->
              @if (showExportMenu) {
                <div class="export-dropdown absolute right-0 top-full mt-2 z-50 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  <!-- Cabecera con acento de marca -->
                  <div class="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                    <span class="material-icons text-sm" style="color: var(--institucional-primario)">download</span>
                    <span class="text-[11px] font-semibold uppercase tracking-widest" style="color: var(--institucional-secundario)">Exportar como</span>
                  </div>
                  <!-- Opciones -->
                  @for (fmt of exportFormats; track fmt.key) {
                    <button
                      type="button"
                      class="export-option flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
                      (click)="doExport(fmt.key)">
                      <div class="export-icon-wrap flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                        <span class="material-icons text-base">{{ fmt.icon }}</span>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-overline text-gray-900 leading-snug">{{ fmt.label }}</p>
                        <p class="text-xs text-gray-500 leading-snug">{{ fmt.sublabel }}</p>
                      </div>
                    </button>
                  }
                </div>
                <!-- Overlay para cerrar -->
                <div class="fixed inset-0 z-40" (click)="showExportMenu = false"></div>
              }
            </div>
          }

          <app-institutional-button
            [config]="{ variant: 'secondary', icon: 'clear_all' }"
            title="Limpiar filtros"
            (clicked)="clearFilters()">
          </app-institutional-button>
        </div><!-- /derecha -->

      </div><!-- /justify-between -->

      <!-- ── Chips de filtros activos ── -->
      <div *ngIf="activeFiltersCount > 0" class="institucional-table-active-filters">
        <span class="institucional-table-active-filters-count">
          {{ activeFiltersCount }} filtro(s) activo(s)
        </span>
        <div class="institucional-table-active-filters-list">
          <span
            *ngFor="let filter of getActiveFilters()"
            class="institucional-table-filter-chip">
            {{ filter.label }}: {{ filter.displayValue }}
            <button
              type="button"
              class="institucional-table-filter-chip-remove"
              title="Quitar filtro"
              (pointerdown)="removeFilter(filter.key, $event)">
              ✕
            </button>
          </span>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .flex {
      display: flex;
    }
    
    .flex-wrap {
      flex-wrap: wrap;
    }
    
    .items-end {
      align-items: flex-end;
    }
    
    .gap-4 {
      gap: 1rem;
    }
    
    .gap-2 {
      gap: 0.5rem;
    }
    
    .flex-1 {
      flex: 1;
    }
    
    .institucional-table-filter-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }
    
    .institucional-table-active-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.25rem;
      padding: 0.625rem 0.875rem;
      background: linear-gradient(180deg, rgba(139, 21, 56, 0.05) 0%, rgba(139, 21, 56, 0.025) 100%);
      border: 1px solid rgba(139, 21, 56, 0.15);
      border-radius: 0.75rem;
    }
    
    .institucional-table-active-filters-count {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--institucional-primario);
      background-color: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(139, 21, 56, 0.18);
      white-space: nowrap;
    }
    
    .institucional-table-active-filters-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      min-width: 0;
      flex: 1;
    }
    
    .institucional-table-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      font-size: 0.8125rem;
      font-weight: 500;
      background-color: var(--institucional-secundario);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 9999px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      max-width: 100%;
    }
    
    .institucional-table-filter-chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      min-width: 1rem;
      padding: 0;
      border: none;
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 700;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.18s ease;
      line-height: 1;
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .institucional-table-filter-chip-remove:hover {
      background-color: rgba(255, 255, 255, 0.35);
      transform: scale(1.05);
    }
    
    .institucional-table-filter-chip-remove:active {
      transform: scale(0.95);
    }

    @media (max-width: 768px) {
      .institucional-table-active-filters {
        padding: 0.5rem 0.625rem;
        gap: 0.5rem;
      }

      .institucional-table-active-filters-count,
      .institucional-table-filter-chip {
        font-size: 0.75rem;
      }
    }
    
    /* Asegurar que el botón pueda recibir clicks aun si hay superposiciones */
    .institucional-table-filter-chip-remove {
      pointer-events: auto;
      z-index: 10;
    }

    /* ── Export dropdown ─────────────────────────────────────── */
    .export-dropdown {
      border-top: 3px solid var(--institucional-primario);
      animation: dropIn 0.15s ease-out both;
    }

    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .export-option {
      border-bottom: 1px solid transparent;
      gap: 0.75rem;
    }

    .export-option:last-child {
      border-bottom: none;
    }

    .export-option:hover {
      background-color: #faf5f7;
    }

    .export-option:hover .export-icon-wrap {
      background-color: var(--institucional-primario);
    }

    .export-option:hover .export-icon-wrap .material-icons {
      color: white;
    }

    .export-icon-wrap {
      background-color: #f5eaed;
      flex-shrink: 0;
      transition: background-color 0.15s ease;
    }

    .export-icon-wrap .material-icons {
      color: var(--institucional-primario);
      transition: color 0.15s ease;
      font-size: 20px;
    }

    /* ── Toast de feedback de exportación ──────────────────────── */
    .export-toast {
      position: absolute;
      bottom: calc(100% + 6px);
      right: 0;
      white-space: nowrap;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      animation: dropIn 0.15s ease-out both;
      z-index: 60;
    }

    .export-toast--success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .export-toast--error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
  `]
})
export class TableFiltersComponent implements OnInit {
  private exportSvc         = inject(ExportService);
  private enhancedExportSvc = inject(EnhancedExportService);

  // ─── Filtros ──────────────────────────────────────────────────────────────
  @Input() filters: FilterConfig[] = [];
  @Input() showGlobalSearch = true;
  @Input() globalSearchPlaceholder = 'Buscar...';
  @Input() globalSearchValue = '';
  @Input() initialValues: FilterValue = {};

  // ─── Export ───────────────────────────────────────────────────────────────
  @Input() showExport = false;
  @Input() showAdvancedFiltersButton = false;
  @Input() exportData: Record<string, unknown>[] = [];
  @Input() exportColumns: ExportColumnDef[] = [];
  /** Columnas específicas por formato (sobreescribe exportColumns para ese formato). */
  @Input() exportColumnsByFormat?: Partial<Record<ExportFormat, ExportColumnDef[]>>;
  @Input() exportFilename = 'exportacion';
  @Input() isLoading = false;
  /** Formatos habilitados en el dropdown. Default: excel, csv, json (sin PDF). */
  @Input() enabledExportFormats: ExportFormat[] = ['excel', 'csv', 'json'];
  /** Configuración del documento exportado (header + estilos). Si no se especifica exportDocConfigByFormat, se usa este para todos los formatos. */
  @Input() exportDocConfig?: ExportDocConfig;
  /** Configuración del documento exportado específica por formato (excel, pdf, csv, json). Sobrescribe exportDocConfig para los formatos especificados. */
  @Input() exportDocConfigByFormat?: Partial<Record<ExportFormat, ExportDocConfig>>;

  @Output() filtersChange = new EventEmitter<FilterValue>();
  @Output() globalSearchChange = new EventEmitter<string>();

  filterForm!: FormGroup;
  globalSearchControl = new FormControl('');
  activeFiltersCount = 0;
  showAdvanced = false;

  // Export dropdown
  showExportMenu = false;
  exportState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  exportError: string | null = null;

  /** Formatos visibles en el dropdown — filtrados dinámicamente por enabledExportFormats. */
  get exportFormats(): ExportFormatDescriptor[] {
    return ALL_EXPORT_FORMAT_DESCRIPTORS.filter(f =>
      this.enabledExportFormats.includes(f.key)
    );
  }

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initializeForm();
    this.setupFormSubscription();
    this.setupGlobalSearchSubscription();
  }

  private setupGlobalSearchSubscription() {
    this.globalSearchControl.setValue(this.globalSearchValue);
    this.globalSearchControl.valueChanges
      .pipe(
        debounceTime(300), // Reducido de 400ms a 300ms para mayor responsividad
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.globalSearchChange.emit(value || '');
      });
  }

  private initializeForm() {
    const formControls: Record<string, unknown> = {};

    this.filters.forEach(filter => {
      const initialValue = this.initialValues[filter.key] || 
        (filter.multiple ? [] : (filter.type === 'boolean' ? '' : ''));
      formControls[filter.key] = [initialValue];

      // Para rangos de fechas, agregar controles adicionales
      if (filter.type === 'daterange') {
        formControls[filter.key + '_from'] = [this.initialValues[filter.key + '_from'] || ''];
        formControls[filter.key + '_to'] = [this.initialValues[filter.key + '_to'] || ''];
      }
    });

    this.filterForm = this.fb.group(formControls);
  }

  private setupFormSubscription() {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(500), // Consistente con búsqueda global para evitar muchas peticiones
        distinctUntilChanged()
      )
      .subscribe(values => {
        this.updateActiveFiltersCount();
        this.filtersChange.emit(values);
      });
  }

  getFilterControl(filterKey: string): FormControl {
    return this.filterForm.get(filterKey) as FormControl;
  }

  getBooleanOptions(): SelectOption[] {
    return [
      { value: 'true', label: 'Sí' },
      { value: 'false', label: 'No' }
    ];
  }

  onGlobalSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.globalSearchChange.emit(target.value);
  }

  clearFilters() {
    this.filterForm.reset();
    this.globalSearchControl.setValue('');
    const clearedValues: FilterValue = {};
    
    this.filters.forEach(filter => {
      clearedValues[filter.key] = filter.multiple ? [] : '';
      if (filter.type === 'daterange') {
        clearedValues[filter.key + '_from'] = '';
        clearedValues[filter.key + '_to'] = '';
      }
    });

    this.filtersChange.emit(clearedValues);
    this.globalSearchChange.emit('');
  }

  removeFilter(filterKey: string, event?: Event) {
    // console debug removed; method will stop propagation if event is provided
    
    // Evitar que el evento burbujee a otros contenedores/overlays
    if (event && typeof (event as Event).stopPropagation === 'function') {
      (event as Event).stopPropagation();
    }

    const filter = this.filters.find(f => f.key === filterKey);
    if (!filter) return;

    const resetValue = filter.multiple ? [] : '';
    this.filterForm.patchValue({ [filterKey]: resetValue });

    if (filter.type === 'daterange') {
      this.filterForm.patchValue({
        [filterKey + '_from']: '',
        [filterKey + '_to']: ''
      });
    }

    // Forzar actualización y emitir inmediatamente para que el padre reciba el cambio
    this.filterForm.updateValueAndValidity();
    this.updateActiveFiltersCount();
    this.filtersChange.emit(this.filterForm.value);
  }

  // removed onChipPointerDown: pointerdown now invokes removeFilter directly

  toggleAdvancedFilters() {
    this.showAdvanced = !this.showAdvanced;
  }

  toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  async doExport(format: string): Promise<void> {
    this.showExportMenu = false;
    this.exportState = 'loading';
    this.exportError = null;

    // Determinar la configuración del documento según el formato
    const docConfig = this.exportDocConfigByFormat?.[format as ExportFormat] ?? this.exportDocConfig;

    const result = await this.enhancedExportSvc.export({
      data:            this.exportData,
      columns:         this.exportColumns,
      columnsByFormat: this.exportColumnsByFormat,
      filename:        this.exportFilename || 'exportacion',
      format:          format as ExportFormat,
      docConfig:       docConfig,
    });

    if (result.success) {
      this.exportState = 'success';
      setTimeout(() => (this.exportState = 'idle'), 2500);
    } else {
      this.exportState = 'error';
      this.exportError = result.error ?? 'Error al exportar.';
      setTimeout(() => { this.exportState = 'idle'; this.exportError = null; }, 4000);
    }
  }

  private updateActiveFiltersCount() {
    const values = this.filterForm.value;
    let count = 0;

    this.filters.forEach(filter => {
      const value = values[filter.key];
      
      if (filter.type === 'daterange') {
        const fromValue = values[filter.key + '_from'];
        const toValue = values[filter.key + '_to'];
        if (fromValue || toValue) count++;
      } else if (filter.multiple) {
        if (Array.isArray(value) && value.length > 0) count++;
      } else {
        if (value !== '' && value !== null && value !== undefined) count++;
      }
    });

    this.activeFiltersCount = count;
  }

  trackFilter(_index: number, filter: FilterConfig): string {
    return filter.key;
  }

  getActiveFilters(): Array<{ key: string; label: string; displayValue: string }> {
    const values = this.filterForm.value;
    const activeFilters: Array<{ key: string; label: string; displayValue: string }> = [];

    this.filters.forEach(filter => {
      const value = values[filter.key];
      let displayValue = '';

      if (filter.type === 'daterange') {
        const fromValue = values[filter.key + '_from'];
        const toValue = values[filter.key + '_to'];
        if (fromValue || toValue) {
          displayValue = `${fromValue || '...'} - ${toValue || '...'}`;
        }
      } else if (filter.type === 'select' && filter.options) {
        if (filter.multiple && Array.isArray(value) && value.length > 0) {
          const selectedOptions = filter.options.filter(opt => value.includes(opt.value));
          displayValue = selectedOptions.map(opt => opt.label).join(', ');
        } else if (!filter.multiple && value !== '') {
          const selectedOption = filter.options.find(opt => opt.value === value);
          displayValue = selectedOption ? selectedOption.label : value;
        }
      } else if (filter.type === 'boolean' && value !== '') {
        displayValue = value === 'true' ? 'Sí' : 'No';
      } else if (value !== '' && value !== null && value !== undefined) {
        displayValue = String(value);
      }

      if (displayValue) {
        activeFilters.push({
          key: filter.key,
          label: filter.label,
          displayValue
        });
      }
    });

    return activeFilters;
  }
}
