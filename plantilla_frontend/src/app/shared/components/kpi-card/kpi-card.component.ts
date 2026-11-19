import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeVariant, InstitutionalBadgeComponent } from '../badge';

export type KpiTone = 'neutral' | 'success' | 'warning' | 'danger';

const TONE_CLASS: Record<KpiTone, string> = {
  neutral: 'text-gray-900',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
};

/**
 * Tarjeta de indicador: título, valor destacado, descripción y badge opcional.
 * Componente genérico: no conoce entidades de ninguna feature.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InstitutionalBadgeComponent],
  template: `
    <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2 h-full">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-sm text-gray-600">{{ title() }}</h3>
        @if (badgeLabel()) {
          <app-institutional-badge [config]="{ variant: badgeVariant(), size: 'sm' }">{{ badgeLabel() }}</app-institutional-badge>
        }
      </header>
      <p class="text-4xl font-bold leading-tight" [class]="valueClass()">{{ value() }}</p>
      @if (description()) {
        <p class="text-xs text-gray-500">{{ description() }}</p>
      }
    </article>
  `,
})
export class KpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly description = input('');
  readonly badgeLabel = input('');
  readonly badgeVariant = input<BadgeVariant>('ghost');
  readonly tone = input<KpiTone>('neutral');

  readonly valueClass = computed(() => TONE_CLASS[this.tone()]);
}
