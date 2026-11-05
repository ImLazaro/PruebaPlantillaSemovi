import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FormHintVariant = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-form-hint-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }
    .fhp {
      border-radius: var(--radius-lg);
      padding: var(--space-12);
      border-left: 4px solid;
      display: flex;
      gap: var(--space-10);
      align-items: flex-start;
    }
    .fhp-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 1.2rem;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    }
    .fhp-title { font-weight: 700; font-size: var(--font-size-sm); }
    .fhp-text { margin-top: 4px; font-size: var(--font-size-sm); }

    .fhp-info { background: #eff6ff; border-left-color: #2563eb; color: #1e3a8a; }
    .fhp-success { background: #ecfdf5; border-left-color: #10b981; color: #065f46; }
    .fhp-warning { background: #fffbeb; border-left-color: #f59e0b; color: #92400e; }
    .fhp-danger { background: #fff1f2; border-left-color: #ef4444; color: #991b1b; }
  `],
  template: `
    <div class="fhp" [class]="'fhp-' + variant">
      <span class="fhp-icon material-symbols-outlined" aria-hidden="true">{{ icon }}</span>
      <div>
        <div class="fhp-title">{{ title }}</div>
        <div class="fhp-text">{{ message }}</div>
        <div class="fhp-text" *ngIf="detail"><strong>Nota:</strong> {{ detail }}</div>
      </div>
    </div>
  `
})
export class FormHintPanelComponent {
  @Input() variant: FormHintVariant = 'info';
  @Input() title = 'Sugerencia';
  @Input() message = '';
  @Input() detail = '';

  get icon(): string {
    if (this.variant === 'success') return 'check_circle';
    if (this.variant === 'warning') return 'warning';
    if (this.variant === 'danger') return 'error';
    return 'info';
  }
}
