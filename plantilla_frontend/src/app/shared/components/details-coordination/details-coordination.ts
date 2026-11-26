import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeVariant, InstitutionalBadgeComponent } from '../badge';

export interface DetailItem {
  label: string;
  value: string | number | null | undefined;
  /** Muestra el valor como badge en lugar de texto. */
  badge?: { variant: BadgeVariant };
  /** Fuente monoespaciada (folios, claves). */
  mono?: boolean;
  /** Ocupa todo el ancho de la cuadrícula. */
  fullWidth?: boolean;
}

/**
 * Lista de detalle etiqueta/valor para paneles y modales de coordinación.
 * Componente genérico: la feature arma los `items` ya formateados.
 */
@Component({
  selector: 'app-details-coordination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InstitutionalBadgeComponent],
  template: `
    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      @for (item of items(); track item.label) {
        <div [class.sm:col-span-2]="item.fullWidth">
          <dt class="text-xs uppercase tracking-wide text-gray-500">{{ item.label }}</dt>
          <dd class="mt-0.5">
            @if (item.badge) {
              <app-institutional-badge [config]="{ variant: item.badge.variant, size: 'sm' }">{{ item.value }}</app-institutional-badge>
            } @else {
              <span
                [class.font-mono]="item.mono"
                [class.text-xs]="item.mono"
                [class.font-semibold]="!item.fullWidth"
                class="text-gray-900">
                {{ item.value ?? emptyText() }}
              </span>
            }
          </dd>
        </div>
      }
    </dl>
  `,
})
export class DetailsCoordinationComponent {
  readonly items = input<DetailItem[]>([]);
  readonly emptyText = input('—');
}
