import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeViewerComponent } from '../code-viewer/code-viewer.component';

@Component({
  selector: 'app-diff-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CodeViewerComponent],
  styles: [`
    :host { display: block; }
    .dv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-12);
    }
    @media (max-width: 900px) {
      .dv-grid { grid-template-columns: 1fr; }
    }
    .dv-card {
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-lg);
      background: #fff;
      overflow: hidden;
    }
    .dv-head {
      padding: var(--space-10) var(--space-12);
      font-weight: 800;
      font-size: var(--font-size-sm);
      border-bottom: 1px solid #f3f4f6;
    }
    .dv-before { color: #991b1b; background: #fff1f2; }
    .dv-after { color: #065f46; background: #ecfdf5; }
    .dv-empty { padding: var(--space-12); font-size: var(--font-size-sm); color: #6b7280; }
  `],
  template: `
    <div class="dv-grid">
      <section class="dv-card">
        <header class="dv-head dv-before">Antes</header>
        <div *ngIf="beforeString; else emptyBefore">
          <app-code-viewer [code]="beforeString" [config]="{ language: language, copyButton: true, maxHeight: maxHeight }"></app-code-viewer>
        </div>
        <ng-template #emptyBefore><div class="dv-empty">Sin valor previo</div></ng-template>
      </section>

      <section class="dv-card">
        <header class="dv-head dv-after">Despues</header>
        <div *ngIf="afterString; else emptyAfter">
          <app-code-viewer [code]="afterString" [config]="{ language: language, copyButton: true, maxHeight: maxHeight }"></app-code-viewer>
        </div>
        <ng-template #emptyAfter><div class="dv-empty">Sin valor nuevo</div></ng-template>
      </section>
    </div>
  `
})
export class DiffViewerComponent {
  @Input() before: unknown;
  @Input() after: unknown;
  @Input() language: 'json' | 'text' | 'yaml' | 'xml' | 'html' = 'json';
  @Input() maxHeight = '320px';

  get beforeString(): string { return this.stringify(this.before); }
  get afterString(): string { return this.stringify(this.after); }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }
}
