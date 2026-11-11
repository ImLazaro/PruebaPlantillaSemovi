import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AsyncStateWrapperComponent } from '@/app/shared/components/async-state-wrapper/async-state-wrapper.component';
import { InstitutionalBadgeComponent } from '@/app/shared/components/badge';
import { BadgeVariant } from '@/app/shared/components/badge/institutional-badge/institutional-badge.component';
import { ResumenAreasDto } from '../../models/inicio-coordinacion.models';

interface Kpi {
  titulo: string;
  valor: number;
  descripcion: string;
  etiqueta: string;
  variant: BadgeVariant;
  valorClass: string;
}

/** Tarjetas KPI: total de áreas, áreas al día y áreas con rezago. */
@Component({
  selector: 'app-resumen-areas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncStateWrapperComponent, InstitutionalBadgeComponent],
  template: `
    <app-async-state-wrapper
      [loading]="loading() && !resumen()"
      [hasError]="!!error()"
      [errorMessage]="error() ?? ''"
      skeletonVariant="card"
      (retry)="retry.emit()">
      <section class="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Resumen de áreas">
        @for (kpi of kpis(); track kpi.titulo) {
          <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2">
            <header class="flex items-start justify-between gap-2">
              <h3 class="text-sm text-gray-600">{{ kpi.titulo }}</h3>
              <app-institutional-badge [config]="{ variant: kpi.variant, size: 'sm' }">
                {{ kpi.etiqueta }}
              </app-institutional-badge>
            </header>
            <p class="text-4xl font-bold leading-tight" [class]="kpi.valorClass">{{ kpi.valor }}</p>
            <p class="text-xs text-gray-500">{{ kpi.descripcion }}</p>
          </article>
        }
      </section>
    </app-async-state-wrapper>
  `,
})
export class ResumenAreasComponent {
  readonly resumen = input<ResumenAreasDto | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();

  readonly kpis = computed<Kpi[]>(() => {
    const r = this.resumen();
    return [
      {
        titulo: 'Total de Áreas Registradas',
        valor: r?.totalAreas ?? 0,
        descripcion: 'Áreas institucionales bajo seguimiento semanal.',
        etiqueta: 'Total',
        variant: 'ghost',
        valorClass: 'text-gray-900',
      },
      {
        titulo: 'Áreas Al Día',
        valor: r?.areasAlDia ?? 0,
        descripcion: 'Áreas con reporte semanal actualizado y sin rezago.',
        etiqueta: 'Al corriente',
        variant: 'success',
        valorClass: 'text-green-600',
      },
      {
        titulo: 'Áreas Con Rezago',
        valor: r?.areasConRezago ?? 0,
        descripcion: 'Áreas con reporte atrasado o sin actualización reciente.',
        etiqueta: 'Rezago',
        variant: 'danger',
        valorClass: 'text-red-600',
      },
    ];
  });
}
