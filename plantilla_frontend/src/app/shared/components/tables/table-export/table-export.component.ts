import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitutionalButtonComponent } from '../../buttons/institutional-button/institutional-button.component';

export interface ExportFormat {
  key: string;
  label: string;
  icon: string;
  extension: string;
  mimeType: string;
}

export interface ExportConfig {
  filename?: string;
  includeHeaders?: boolean;
  selectedOnly?: boolean;
  formats?: ExportFormat[];
}

export interface ExportEvent {
  format: string;
  config: ExportConfig;
  data: Record<string, unknown>[];
}

@Component({
  selector: 'app-table-export',
  standalone: true,
  imports: [CommonModule, FormsModule, InstitutionalButtonComponent],
  template: `
    <div class="relative inline-block text-left">
      <!-- Botón principal de exportación -->
      <app-institutional-button
        [config]="{
          variant: 'secondary',
          icon: 'download'
        }"
        [class.ring-2]="showOptions"
        [class.ring-guinda-600]="showOptions"
        title="Exportar datos"
        (clicked)="toggleOptions()">
        Exportar
      </app-institutional-button>

      <!-- Opciones de exportación -->
      <div *ngIf="showOptions" 
           class="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 animate-fade-in-down">
        
        <div class="p-3">
          <h3 class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Formato</h3>
          
          <!-- Formatos disponibles -->
          <div class="grid grid-cols-2 gap-2 mb-3">
            <button *ngFor="let format of availableFormats"
                    (click)="selectFormat(format)"
                    class="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 hover:border-guinda-600 hover:bg-guinda-50 transition-all group bg-white">
              <span class="material-icons text-xl text-gray-400 group-hover:text-guinda-600 mb-1">{{ format.icon }}</span>
              <span class="text-[10px] font-medium text-gray-600 group-hover:text-guinda-700">{{ format.label }}</span>
            </button>
          </div>

          <!-- Configuración -->
          <div class="border-t border-gray-100 pt-3 space-y-2">
            <label class="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" 
                     [(ngModel)]="config.includeHeaders"
                     (ngModelChange)="updateConfig()"
                     class="w-3.5 h-3.5 text-guinda-600 border-gray-300 rounded focus:ring-guinda-500 cursor-pointer">
              <span class="text-xs text-gray-600 group-hover:text-gray-900">Incluir encabezados</span>
            </label>

            <label *ngIf="hasSelectedItems" class="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" 
                     [(ngModel)]="config.selectedOnly"
                     (ngModelChange)="updateConfig()"
                     class="w-3.5 h-3.5 text-guinda-600 border-gray-300 rounded focus:ring-guinda-500 cursor-pointer">
              <span class="text-xs text-gray-600 group-hover:text-gray-900">
                Solo seleccionados <span class="font-bold text-guinda-600">({{ selectedCount }})</span>
              </span>
            </label>

            <div class="pt-1">
              <label class="block text-[10px] font-medium text-gray-500 mb-1">Nombre del archivo</label>
              <input type="text" 
                     [(ngModel)]="config.filename"
                     (ngModelChange)="updateConfig()"
                     class="block w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-guinda-600 focus:border-transparent outline-none transition-all placeholder-gray-300"
                     placeholder="nombre-archivo">
            </div>
          </div>
        </div>

        <!-- Footer Info -->
        <div class="bg-gray-50 px-3 py-2 rounded-b-xl border-t border-gray-100 text-center">
          <span class="text-[10px] text-gray-500">
            Se exportarán <span class="font-semibold text-gray-700">{{ getExportCount() }}</span> registros
          </span>
        </div>
      </div>

      <!-- Overlay para cerrar -->
      <div *ngIf="showOptions" class="fixed inset-0 z-40" (click)="closeOptions()"></div>
    </div>

    <!-- Indicador de exportación en progreso -->
    <div *ngIf="isExporting" class="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-guinda-600"></div>
        <span class="text-sm font-medium text-gray-600">Generando archivo...</span>
      </div>
    </div>
  `,
  styles: []
})
export class TableExportComponent {
  @Input() data: Record<string, unknown>[] = [];
  @Input() selectedItems: Record<string, unknown>[] = [];
  @Input() columns: { key: string; label: string; [k: string]: unknown }[] = [];
  @Input() defaultConfig: Partial<ExportConfig> = {};

  @Output() export = new EventEmitter<ExportEvent>();

  showOptions = false;
  isExporting = false;
  
  config: ExportConfig = {
    filename: 'datos-tabla',
    includeHeaders: true,
    selectedOnly: false,
    formats: []
  };

  defaultFormats: ExportFormat[] = [
    {
      key: 'csv',
      label: 'CSV',
      icon: 'description',
      extension: 'csv',
      mimeType: 'text/csv'
    },
    {
      key: 'excel',
      label: 'Excel',
      icon: 'grid_on',
      extension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      key: 'json',
      label: 'JSON',
      icon: 'code',
      extension: 'json',
      mimeType: 'application/json'
    },
    {
      key: 'pdf',
      label: 'PDF',
      icon: 'picture_as_pdf',
      extension: 'pdf',
      mimeType: 'application/pdf'
    }
  ];

  ngOnInit() {
    this.config = {
      ...this.config,
      ...this.defaultConfig,
      formats: this.defaultConfig.formats || this.defaultFormats
    };
  }

  get availableFormats(): ExportFormat[] {
    return this.config.formats || this.defaultFormats;
  }

  get hasSelectedItems(): boolean {
    return this.selectedItems.length > 0;
  }

  get selectedCount(): number {
    return this.selectedItems.length;
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }

  closeOptions() {
    this.showOptions = false;
  }

  selectFormat(format: ExportFormat) {
    this.isExporting = true;
    
    const exportData = this.config.selectedOnly 
      ? this.selectedItems 
      : this.data;

    this.export.emit({
      format: format.key,
      config: this.config,
      data: exportData
    });

    // Simular tiempo de exportación
    setTimeout(() => {
      this.isExporting = false;
      this.closeOptions();
    }, 1500);
  }

  updateConfig() {
    // Trigger change detection cuando se actualiza la configuración
  }

  getExportCount(): number {
    return this.config.selectedOnly ? this.selectedItems.length : this.data.length;
  }
}
