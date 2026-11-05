import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';

export type DataFilterType = 'text' | 'select' | 'date';

export interface DataFilterField {
  key: string;
  label: string;
  type: DataFilterType;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

@Component({
  selector: 'app-data-filters-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, InstitutionalButtonComponent],
  styles: [`
    :host { display: block; }
    .dfb {
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-lg);
      padding: var(--space-12);
      background: #ffffff;
      display: grid;
      gap: var(--space-10);
    }
    .dfb-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-10);
    }
    .dfb-field { display: flex; flex-direction: column; gap: 6px; }
    .dfb-label { font-size: var(--font-size-xs); color: #4b5563; font-weight: 700; }
    .dfb-input, .dfb-select {
      border: 1px solid #d1d5db;
      border-radius: var(--radius-md);
      padding: 8px 10px;
      font-size: var(--font-size-sm);
      background: #fff;
    }
    .dfb-input:focus, .dfb-select:focus {
      outline: none;
      border-color: var(--institucional-primario);
      box-shadow: 0 0 0 3px rgba(157, 36, 73, 0.18);
    }
    .dfb-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-8);
      flex-wrap: wrap;
    }
  `],
  template: `
    <div class="dfb">
      <div class="dfb-grid">
        <div class="dfb-field" *ngFor="let f of fields">
          <label class="dfb-label">{{ f.label }}</label>

          <input
            *ngIf="f.type === 'text'"
            class="dfb-input"
            type="text"
            [placeholder]="f.placeholder || ''"
            [(ngModel)]="model[f.key]"
            (keydown.enter)="applyFilters()" />

          <input
            *ngIf="f.type === 'date'"
            class="dfb-input"
            type="date"
            [(ngModel)]="model[f.key]" />

          <select
            *ngIf="f.type === 'select'"
            class="dfb-select"
            [(ngModel)]="model[f.key]">
            <option value="">Todos</option>
            <option *ngFor="let o of (f.options || [])" [value]="o.value">{{ o.label }}</option>
          </select>
        </div>
      </div>

      <div class="dfb-actions">
        <app-institutional-button
          [config]="{ variant: 'ghost', size: 'sm', icon: 'filter_alt_off', iconPosition: 'left' }"
          (clicked)="clearFilters()">
          Limpiar
        </app-institutional-button>

        <app-institutional-button
          [config]="{ variant: 'primary', size: 'sm', icon: 'search', iconPosition: 'left' }"
          (clicked)="applyFilters()">
          Aplicar filtros
        </app-institutional-button>
      </div>
    </div>
  `
})
export class DataFiltersBarComponent {
  @Input() fields: DataFilterField[] = [];
  @Input() model: Record<string, string> = {};

  @Output() modelChange = new EventEmitter<Record<string, string>>();
  @Output() apply = new EventEmitter<Record<string, string>>();
  @Output() clear = new EventEmitter<void>();

  applyFilters(): void {
    const value = { ...this.model };
    this.modelChange.emit(value);
    this.apply.emit(value);
  }

  clearFilters(): void {
    const next: Record<string, string> = {};
    for (const f of this.fields) next[f.key] = '';
    this.model = next;
    this.modelChange.emit(next);
    this.clear.emit();
  }
}
