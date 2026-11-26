import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';

import { InstitutionalButtonComponent } from '../../shared/components/buttons/institutional-button/institutional-button.component';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header.component';
import { InfoBannerComponent } from '../../shared/components/info-banner/info-banner.component';
import {
  WeekStatusCell,
  WeekStatusGridComponent,
  WeekStatusTone,
} from '../../shared/components/week-status-grid/week-status-grid.component';
import {
  WeekStatusLegendComponent,
  WeekStatusLegendItem,
} from '../../shared/components/week-status-legend/week-status-legend.component';

import { WeekCaptureStatus, WeeklyCaptureSummary } from '../models/week-status.model';
import { CurrentUserService } from '../services/current-user.service';
import { WeeklyCaptureService } from '../services/weekly-capture.service';

const STATUS_VIEW: Record<WeekCaptureStatus, { tone: WeekStatusTone; label: string }> = {
  captured: { tone: 'success', label: 'Capturada' },
  current: { tone: 'primary', label: 'Semana activa' },
  overdue: { tone: 'danger', label: 'Vencida sin captura' },
  future: { tone: 'neutral', label: 'Próxima' },
};

type SummaryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: WeeklyCaptureSummary };

/** 2026-09-27 → 27/09/2026 */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Inicio del área: avance anual de captura semanal y accesos a captura de la
 * semana activa y a actualización extemporánea de semanas vencidas.
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DashboardHeaderComponent,
    InfoBannerComponent,
    InstitutionalButtonComponent,
    WeekStatusGridComponent,
    WeekStatusLegendComponent,
  ],
  template: `
    <div class="space-y-4">
      <app-dashboard-header
        title="SISER 2.0"
        subtitle="Sistema de Registro, Seguimiento y Concertación Institucional"
        [userLabel]="userName()"
        [userDetail]="areaLabel()"
      />

      @switch (state().status) {
        @case ('loading') {
          <p class="rounded-xl border border-gray-100 bg-white p-6 text-sm text-slate-500" aria-live="polite">
            Cargando avance de captura...
          </p>
        }
        @case ('error') {
          <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">
            No se pudo cargar el avance de captura. Recarga la página para intentarlo de nuevo.
          </div>
        }
        @case ('ready') {
          @if (summary(); as data) {
            <!-- Indicadores -->
            <section class="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Resumen de captura">
              <article class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 class="text-sm text-slate-600">Semana activa</h2>
                <p class="mt-1 text-3xl font-bold text-slate-900">Semana {{ data.currentWeek }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ currentPeriod() }}</p>
              </article>
              <article class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 class="text-sm text-slate-600">Semanas capturadas</h2>
                <p class="mt-1 text-3xl font-bold text-green-600">{{ counts().captured }} / {{ counts().elapsed }}</p>
                <p class="mt-1 text-xs text-slate-500">Semanas transcurridas del {{ data.year }} con captura completa.</p>
              </article>
              <article class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 class="text-sm text-slate-600">Semanas vencidas</h2>
                <p class="mt-1 text-3xl font-bold" [class]="counts().overdue ? 'text-red-600' : 'text-slate-900'">{{ counts().overdue }}</p>
                <p class="mt-1 text-xs text-slate-500">Requieren actualización extemporánea con oficio de soporte.</p>
              </article>
            </section>

            @if (counts().overdue > 0) {
              <app-info-banner
                [config]="{ type: 'danger', variant: 'soft', size: 'sm', title: 'Tienes ' + counts().overdue + ' semana(s) vencida(s) sin captura' }"
                [message]="'Semanas: ' + overdueWeeks() + '. Regulariza la información desde Actualización Extemporánea de Cifras.'">
              </app-info-banner>
            }

            <!-- Accesos -->
            <section class="flex flex-wrap gap-3" aria-label="Accesos rápidos">
              <a routerLink="/captura-semanal">
                <app-institutional-button variant="primary" icon="edit_note">
                  Capturar semana {{ data.currentWeek }}
                </app-institutional-button>
              </a>
              @if (counts().overdue > 0) {
                <a routerLink="/actualizacion-extemporanea">
                  <app-institutional-button variant="secondary" icon="history">
                    Actualización extemporánea
                  </app-institutional-button>
                </a>
              }
            </section>

            <!-- Avance anual -->
            <section class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="inicio-avance">
              <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="inicio-avance" class="text-sm font-bold text-slate-900">Avance de captura {{ data.year }}</h2>
                  <p class="text-xs text-slate-500">Selecciona la semana activa o una vencida para ir a su captura.</p>
                </div>
                <app-week-status-legend [items]="legend()" />
              </div>
              <app-week-status-grid
                [cells]="cells()"
                [highlightWeek]="data.currentWeek"
                [ariaLabel]="'Semanas de ' + data.year"
                (weekSelected)="openWeek($event)"
              />
            </section>
          }
        }
      }
    </div>
  `,
})
export class InicioComponent {
  private readonly weeklyCapture = inject(WeeklyCaptureService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly router = inject(Router);

  protected readonly userName = this.currentUser.fullName;

  protected readonly state = toSignal(
    this.weeklyCapture.getSummary().pipe(
      map((data): SummaryState => ({ status: 'ready', data })),
      startWith<SummaryState>({ status: 'loading' }),
      catchError(() => of<SummaryState>({ status: 'error' })),
    ),
    { initialValue: { status: 'loading' } as SummaryState },
  );

  protected readonly summary = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s.data : null;
  });

  protected readonly areaLabel = computed(
    () => (this.currentUser.areaName() || this.summary()?.area || '').toUpperCase(),
  );

  protected readonly counts = computed(() => {
    const weeks = this.summary()?.weeks ?? [];
    const captured = weeks.filter((w) => w.status === 'captured').length;
    const overdue = weeks.filter((w) => w.status === 'overdue').length;
    return { captured, overdue, elapsed: captured + overdue };
  });

  protected readonly overdueWeeks = computed(() =>
    (this.summary()?.weeks ?? []).filter((w) => w.status === 'overdue').map((w) => w.week).join(', '),
  );

  protected readonly currentPeriod = computed(() => {
    const data = this.summary();
    const week = data?.weeks.find((w) => w.week === data.currentWeek);
    return week ? `Del ${shortDate(week.start)} al ${shortDate(week.end)}` : '';
  });

  protected readonly cells = computed<WeekStatusCell[]>(() =>
    (this.summary()?.weeks ?? []).map((w) => ({
      week: w.week,
      tone: STATUS_VIEW[w.status].tone,
      description: `Semana ${w.week} (${shortDate(w.start)} - ${shortDate(w.end)}) · ${STATUS_VIEW[w.status].label}`,
      disabled: w.status === 'future' || w.status === 'captured',
    })),
  );

  protected readonly legend = computed<WeekStatusLegendItem[]>(() => {
    const weeks = this.summary()?.weeks ?? [];
    return (Object.keys(STATUS_VIEW) as WeekCaptureStatus[]).map((status) => ({
      tone: STATUS_VIEW[status].tone,
      label: STATUS_VIEW[status].label,
      count: weeks.filter((w) => w.status === status).length,
    }));
  });

  protected openWeek(week: number): void {
    const item = this.summary()?.weeks.find((w) => w.week === week);
    if (item?.status === 'current') void this.router.navigate(['/captura-semanal']);
    else if (item?.status === 'overdue') void this.router.navigate(['/actualizacion-extemporanea']);
  }
}
