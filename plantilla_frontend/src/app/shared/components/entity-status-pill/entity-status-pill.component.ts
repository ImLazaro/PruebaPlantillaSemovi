import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiVariant } from '../_ui-types';
import { InstitutionalBadgeComponent } from '../badge';

export interface StatusPillMap {
  label: string;
  variant: UiVariant;
  icon?: string;
}

const DEFAULT_MAP: Record<string, StatusPillMap> = {
  active: { label: 'Activo', variant: 'success', icon: 'check_circle' },
  inactive: { label: 'Inactivo', variant: 'secondary', icon: 'pause_circle' },
  blocked: { label: 'Bloqueado', variant: 'danger', icon: 'lock' },
  expired: { label: 'Expirado', variant: 'warning', icon: 'schedule' },
  pending: { label: 'Pendiente', variant: 'warning', icon: 'hourglass_top' },
  revoked: { label: 'Revocado', variant: 'danger', icon: 'block' },
};

@Component({
  selector: 'app-entity-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InstitutionalBadgeComponent],
  template: `
    <app-institutional-badge [config]="{ variant: resolved.variant, size: size, icon: resolved.icon }">
      {{ resolved.label }}
    </app-institutional-badge>
  `
})
export class EntityStatusPillComponent {
  @Input() status = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() map: Record<string, StatusPillMap> = {};

  get resolved(): StatusPillMap {
    const key = (this.status || '').toLowerCase();
    return this.map[key] || DEFAULT_MAP[key] || { label: this.status || 'Desconocido', variant: 'ghost', icon: 'help' };
  }
}
