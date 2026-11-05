import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiVariant } from '../_ui-types';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';

export interface BulkToolbarAction {
  key: string;
  label: string;
  icon?: string;
  variant?: UiVariant;
  disabled?: boolean;
}

@Component({
  selector: 'app-bulk-actions-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InstitutionalButtonComponent],
  styles: [`
    :host { display: block; }
    .bat {
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: var(--radius-lg);
      padding: var(--space-10) var(--space-12);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-10);
      flex-wrap: wrap;
    }
    .bat-count { font-size: var(--font-size-sm); color: #374151; font-weight: 700; }
    .bat-actions { display: flex; gap: var(--space-8); flex-wrap: wrap; }
  `],
  template: `
    <div class="bat" *ngIf="selectedCount > 0">
      <div class="bat-count">{{ selectedCount }} seleccionado(s)</div>
      <div class="bat-actions">
        <app-institutional-button
          *ngFor="let action of actions"
          [config]="{ variant: action.variant || 'secondary', size: 'sm', icon: action.icon, iconPosition: action.icon ? 'left' : undefined, disabled: action.disabled }"
          (clicked)="actionClick.emit(action.key)">
          {{ action.label }}
        </app-institutional-button>
        <app-institutional-button
          [config]="{ variant: 'ghost', size: 'sm', icon: 'close', iconPosition: 'left' }"
          (clicked)="clearSelection.emit()">
          Limpiar seleccion
        </app-institutional-button>
      </div>
    </div>
  `
})
export class BulkActionsToolbarComponent {
  @Input() selectedCount = 0;
  @Input() actions: BulkToolbarAction[] = [];

  @Output() actionClick = new EventEmitter<string>();
  @Output() clearSelection = new EventEmitter<void>();
}
