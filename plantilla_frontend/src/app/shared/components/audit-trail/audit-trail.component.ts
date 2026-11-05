import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelativeTimeComponent } from '../relative-time/relative-time.component';
import { JsonViewerComponent } from '../json-viewer/json-viewer.component';

export interface AuditTrailItem {
  id: string;
  action: string;
  actor: string;
  resource?: string;
  at: string | Date;
  ip?: string;
  detail?: string;
  metadata?: unknown;
}

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RelativeTimeComponent, JsonViewerComponent],
  styles: [`
    :host { display: block; }
    .at-list { display: flex; flex-direction: column; gap: var(--space-10); }
    .at-item {
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-lg);
      background: #fff;
      padding: var(--space-12);
      display: grid;
      grid-template-columns: 22px 1fr;
      gap: var(--space-10);
    }
    .at-dot {
      width: 12px;
      height: 12px;
      border-radius: 9999px;
      background: var(--institucional-primario);
      margin-top: 6px;
      box-shadow: 0 0 0 4px rgba(157,36,73,0.15);
    }
    .at-title { font-weight: 800; color: #111827; font-size: var(--font-size-sm); }
    .at-meta { font-size: var(--font-size-xs); color: #6b7280; display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
    .at-detail { margin-top: 8px; font-size: var(--font-size-sm); color: #374151; }
    .at-btn {
      margin-top: 8px;
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: var(--radius-md);
      padding: 5px 8px;
      cursor: pointer;
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: #4b5563;
    }
  `],
  template: `
    <div class="at-list">
      <div class="at-item" *ngFor="let item of items; trackBy: trackById">
        <div class="at-dot"></div>
        <div>
          <div class="at-title">{{ item.action }}</div>
          <div class="at-meta">
            <span>{{ item.actor }}</span>
            <span *ngIf="item.resource">Recurso: {{ item.resource }}</span>
            <span *ngIf="item.ip">IP: {{ item.ip }}</span>
            <app-relative-time [date]="item.at" [config]="{ showTooltip: true, allowFuture: true }"></app-relative-time>
          </div>
          <div class="at-detail" *ngIf="item.detail">{{ item.detail }}</div>

          <button
            *ngIf="item.metadata"
            type="button"
            class="at-btn"
            (click)="toggle(item.id)">
            {{ expanded[item.id] ? 'Ocultar metadata' : 'Ver metadata' }}
          </button>

          <div *ngIf="item.metadata && expanded[item.id]" style="margin-top:8px;">
            <app-json-viewer [data]="item.metadata" [config]="{ expandDepth: 4, theme: 'light' }"></app-json-viewer>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuditTrailComponent {
  @Input() items: AuditTrailItem[] = [];
  @Output() itemClick = new EventEmitter<AuditTrailItem>();

  expanded: Record<string, boolean> = {};

  trackById(_: number, item: AuditTrailItem): string { return item.id; }
  toggle(id: string): void { this.expanded[id] = !this.expanded[id]; }
}
