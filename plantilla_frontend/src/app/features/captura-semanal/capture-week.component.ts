import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  BadgeConfig,
  InstitutionalBadgeComponent,
} from '../../shared/components/badge/institutional-badge/institutional-badge.component';
import { InstitutionalButtonComponent } from '../../shared/components/buttons/institutional-button/institutional-button.component';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header.component';
import {
  CardConfig,
  InstitutionalCardComponent,
} from '../../shared/components/institutional-card/institutional-card.component';
import {
  InstitutionalTableComponent,
  TableColumn,
  TableConfig,
} from '../../shared/components/tables/institutional-table/institutional-table.component';

import {
  CaptureProcedure,
  ProcedureStatus,
} from '../models/capture-form.model';

import { CaptureFormService } from 'src/app/features/services/capture-form.service';
import { CurrentUserService } from 'src/app/features/services/current-user.service';

import { ManualCaptureComponent } from './manual-capture/manual-capture.component';

const STATUS_VIEW: Record<
  ProcedureStatus,
  { label: string; config: BadgeConfig }
> = {
  completed: {
    label: 'Completado',
    config: { variant: 'success', size: 'sm' },
  },
  pending: {
    label: 'Pendiente',
    config: { variant: 'ghost', size: 'sm' },
  },
};

function isProcedureStatus(value: unknown): value is ProcedureStatus {
  return value === 'completed' || value === 'pending';
}

function formatLongDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);

  const date = new Date(year, month - 1, day);

  const weekday = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
  }).format(date);

  const formattedDay = String(date.getDate()).padStart(2, '0');
  const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formattedDay}/${formattedMonth}/${date.getFullYear()}`;
}

@Component({
  selector: 'app-captura-semanal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DashboardHeaderComponent,
    InstitutionalBadgeComponent,
    InstitutionalButtonComponent,
    InstitutionalCardComponent,
    InstitutionalTableComponent,
    ManualCaptureComponent,
  ],
  template: `
    <ng-template #statusCell let-row>
      @if (getStatusView(row.status); as status) {
        <app-institutional-badge [config]="status.config">
          {{ status.label }}
        </app-institutional-badge>
      }
    </ng-template>

    <ng-template #actionCell let-row>
      <app-institutional-button
        variant="primary"
        size="sm"
        icon="edit_note"
        (clicked)="captureManually(row)"
      >
        Captura Manual
      </app-institutional-button>
    </ng-template>

    <div class="space-y-4">
      <app-dashboard-header
        title="SISER 2.0"
        subtitle="Sistema de Registro, Seguimiento y Concertación Institucional"
        [userLabel]="userName()"
        [userDetail]="areaLabel()"
      />

      @if (form(); as data) {
        <app-institutional-card [config]="cardConfig">
          <div
            slot="header"
            class="flex flex-wrap items-start justify-between gap-3"
          >
            <div>
              <h2 class="text-xl font-bold text-slate-900">
                Captura de formulario
              </h2>

              <p class="text-xs text-slate-500">
                Ingrese la información correspondiente a los trámites activos
                de la semana {{ data.week }}.
              </p>
            </div>

            <app-institutional-badge [config]="outlineBadge">
              Semana {{ data.week }}
            </app-institutional-badge>
          </div>

          <div class="space-y-4">
            <div class="grid gap-4 md:grid-cols-[1fr_auto]">
              <div
                class="rounded-lg border border-orange-200 bg-orange-50 p-4"
                role="note"
              >
                <p class="text-sm font-bold text-orange-800">
                  Semana Activa {{ data.week }} ({{ periodLabel() }})
                </p>

                <p class="mt-1 text-xs text-orange-700">
                  Esta pantalla permite capturar o editar los trámites
                  asignados al departamento seleccionado durante el periodo
                  activo.
                </p>
              </div>

              <div
                class="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-4"
              >
                <app-institutional-button
                  variant="ghost"
                  icon="download"
                  [uiConfig]="outlineButton"
                  (clicked)="uploadTemplate()"
                >
                  Cargar Plantilla Semanal en Excel (.xlsx)
                </app-institutional-button>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs text-slate-500">
                  Área bloqueada
                </p>

                <app-institutional-badge [config]="readonlyBadge">
                  Solo lectura
                </app-institutional-badge>
              </div>

              <p class="mt-1 text-sm font-bold uppercase text-slate-900">
                {{ data.area }}
              </p>

              <p class="mt-1 text-xs text-slate-500">
                Los datos de esta sección se cargan desde la configuración
                institucional y no pueden modificarse desde esta pantalla.
              </p>
            </div>

            <section aria-labelledby="procedures-title">
              <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3
                    id="procedures-title"
                    class="text-sm font-bold text-slate-900"
                  >
                    Trámites asignados
                  </h3>

                  <p class="text-xs text-slate-500">
                    Listado ilustrativo de actividades para captura o edición.
                  </p>
                </div>

                <app-institutional-badge [config]="outlineBadge">
                  Datos de ejemplo
                </app-institutional-badge>
              </div>

              <app-institutional-table
                [data]="data.procedures"
                [columns]="columns()"
                [config]="tableConfig"
              />

              <div
                class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"
              >
                <p>
                  {{ data.procedures.length }} trámites ilustrativos
                  disponibles para captura.
                </p>

                <p>
                  Período de captura: semana {{ data.week }}
                </p>
              </div>
            </section>
          </div>
        </app-institutional-card>

        <app-institutional-button
          variant="success"
          (clicked)="finishCapture()"
        >
          Finalizar captura semanal
        </app-institutional-button>
      }
    </div>

    @if (selectedProcedure(); as procedure) {
      <app-manual-capture
        [procedureId]="procedure.id"
        [procedureCode]="procedure.code"
        [procedureName]="procedure.name"
        [area]="form()?.area ?? ''"
        [week]="form()?.week ?? ''"
        (closed)="selectedProcedure.set(null)"
        (saved)="onManualCaptureSaved(procedure)"
      />
    }
  `,
})
export class CapturaSemanalComponent {
  private readonly captureForm = inject(CaptureFormService);
  private readonly currentUser = inject(CurrentUserService);

  private readonly statusCell =
    viewChild<TemplateRef<unknown>>('statusCell');

  private readonly actionCell =
    viewChild<TemplateRef<unknown>>('actionCell');

  protected readonly userName = this.currentUser.fullName;

  protected readonly cardConfig: CardConfig = {
    showShadow: false,
    showBorder: true,
    showFooter: false,
  };

  protected readonly tableConfig: TableConfig = {
    hoverable: true,
  };

  protected readonly outlineBadge: BadgeConfig = {
    variant: 'outline',
    size: 'sm',
  };

  protected readonly readonlyBadge: BadgeConfig = {
    variant: 'danger',
    size: 'sm',
  };

  protected readonly outlineButton = {
    customClass:
      '!border !border-gray-300 !bg-white !text-slate-800 hover:!bg-gray-50',
  };

  protected readonly form = toSignal(
    this.captureForm.getActiveWeekForm(),
    {
      initialValue: null,
    },
  );

  /** Trámite abierto en la ventana de captura manual. */
  protected readonly selectedProcedure = signal<CaptureProcedure | null>(null);

  protected readonly areaLabel = computed(
    () => this.form()?.area.toUpperCase() ?? '',
  );

  protected readonly periodLabel = computed(() => {
    const data = this.form();

    return data
      ? `Del ${formatLongDay(data.periodStart)} al ${formatLongDay(data.periodEnd)}`
      : '';
  });

  protected readonly columns = computed<TableColumn[]>(() => [
    {
      key: 'code',
      label: 'Código',
    },
    {
      key: 'name',
      label: 'Trámite/Actividad',
    },
    {
      key: 'status',
      label: 'Estatus',
      template: this.statusCell(),
    },
    {
      key: 'action',
      label: 'Acción',
      template: this.actionCell(),
    },
  ]);

  protected getStatusView(status: unknown) {
    return isProcedureStatus(status)
      ? STATUS_VIEW[status]
      : null;
  }

  protected captureManually(procedure: CaptureProcedure): void {
    this.selectedProcedure.set(procedure);
  }

  protected onManualCaptureSaved(procedure: CaptureProcedure): void {
    this.captureForm.markProcedureCompleted(procedure.id);
    this.selectedProcedure.set(null);
  }

  protected uploadTemplate(): void {
    // TODO: definir con el equipo si sube la plantilla o descarga la vacía.
  }

  protected finishCapture(): void {
    // TODO: enviar la captura de la semana al backend.
  }
}
