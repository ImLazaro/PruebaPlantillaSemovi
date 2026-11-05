import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';

export interface ExportMenuOption {
  key: 'csv' | 'json';
  label: string;
}

@Component({
  selector: 'app-data-export-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InstitutionalButtonComponent],
  styles: [`
    :host { display: inline-block; position: relative; }
    .dem-pop {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 180px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-md);
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      overflow: hidden;
      z-index: 20;
    }
    .dem-item {
      width: 100%;
      border: none;
      background: #fff;
      padding: 9px 12px;
      text-align: left;
      font-size: var(--font-size-sm);
      cursor: pointer;
      color: #374151;
    }
    .dem-item:hover { background: #f9fafb; }
  `],
  template: `
    <app-institutional-button
      [config]="{ variant: 'secondary', size: 'md', icon: 'download', iconPosition: 'left' }"
      (clicked)="open = !open">
      Exportar
    </app-institutional-button>

    <div class="dem-pop" *ngIf="open">
      <button
        *ngFor="let opt of options"
        type="button"
        class="dem-item"
        (click)="select(opt.key)">
        {{ opt.label }}
      </button>
    </div>
  `
})
export class DataExportMenuComponent {
  @Input() data: Record<string, unknown>[] = [];
  @Input() filename = 'export';
  @Input() options: ExportMenuOption[] = [
    { key: 'csv', label: 'Exportar CSV' },
    { key: 'json', label: 'Exportar JSON' },
  ];

  @Output() exported = new EventEmitter<'csv' | 'json'>();

  open = false;

  select(type: 'csv' | 'json'): void {
    if (type === 'json') this.downloadJson();
    if (type === 'csv') this.downloadCsv();
    this.open = false;
    this.exported.emit(type);
  }

  private downloadJson(): void {
    const text = JSON.stringify(this.data, null, 2);
    this.download(`${this.filename}.json`, text, 'application/json');
  }

  private downloadCsv(): void {
    if (!this.data.length) {
      this.download(`${this.filename}.csv`, '', 'text/csv;charset=utf-8');
      return;
    }

    const headers = Object.keys(this.data[0]);
    const rows = this.data.map((row) => headers.map((h) => this.csvCell(row[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    this.download(`${this.filename}.csv`, csv, 'text/csv;charset=utf-8');
  }

  private csvCell(value: unknown): string {
    const raw = value === null || value === undefined ? '' : String(value);
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    const escaped = safe.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private download(filename: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
