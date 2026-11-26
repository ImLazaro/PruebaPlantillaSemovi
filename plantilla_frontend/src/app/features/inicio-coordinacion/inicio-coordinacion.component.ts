import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncStateWrapperComponent } from '@/app/shared/components/async-state-wrapper/async-state-wrapper.component';
import { DashboardHeaderComponent } from '@/app/shared/components/dashboard-header/dashboard-header.component';
import { DetailItem, DetailsCoordinationComponent } from '@/app/shared/components/details-coordination/details-coordination';
import { InputComponent } from '@/app/shared/components/inputs/input-wrapper/input.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { KpiCardComponent } from '@/app/shared/components/kpi-card/kpi-card.component';
import { ModalComponent } from '@/app/shared/components/modals/modal/modal.component';
import { PillTab, PillTabsComponent } from '@/app/shared/components/pill-tabs/pill-tabs.component';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import { AlertaModificacionDto, ESTATUS_ALERTA_MAP } from '../models/alert-validation.model';
import { InicioCoordinacionStore } from '../services/coordination.service';
import { CurrentUserService } from '../services/current-user.service';
import { ComplianceMonitorComponent } from './compliance-monitor/compliance-monitor.component';
import { ExtemporaneousAlertsComponent } from './extemporaneous-alerts/extemporaneous-alerts.component';

/**
 * Pantalla de inicio de la Coordinación Técnica (SISER 2.0).
 * Datos: `InicioCoordinacionStore` (features/services/coordination.service.ts).
 */
@Component({
  selector: 'app-inicio-coordinacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncStateWrapperComponent,
    DashboardHeaderComponent,
    DetailsCoordinationComponent,
    InputComponent,
    InstitutionalButtonComponent,
    KpiCardComponent,
    ModalComponent,
    PillTabsComponent,
    ComplianceMonitorComponent,
    ExtemporaneousAlertsComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <app-dashboard-header
        title="SISER 2.0"
        subtitle="Coordinación Técnica · Supervisión institucional"
        [userLabel]="userName()"
        [userDetail]="areaName() || 'Coordinación Técnica'">
      </app-dashboard-header>

      <app-pill-tabs
        [tabs]="secciones"
        [activeId]="seccionActiva()"
        ariaLabel="Secciones de coordinación"
        (tabChange)="seccionActiva.set($event)">
      </app-pill-tabs>

      <app-async-state-wrapper
        [loading]="store.resumen().loading && !store.resumen().data"
        [hasError]="!!store.resumen().error"
        [errorMessage]="store.resumen().error ?? ''"
        skeletonVariant="card"
        (retry)="store.cargarResumen()">
        <section class="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Resumen de áreas">
          <app-kpi-card
            title="Total de Áreas Registradas"
            [value]="store.resumen().data?.totalAreas ?? 0"
            description="Áreas institucionales bajo seguimiento semanal."
            badgeLabel="Total">
          </app-kpi-card>
          <app-kpi-card
            title="Áreas Al Día"
            [value]="store.resumen().data?.areasAlDia ?? 0"
            description="Áreas con reporte semanal actualizado y sin rezago."
            badgeLabel="Al corriente"
            badgeVariant="success"
            tone="success">
          </app-kpi-card>
          <app-kpi-card
            title="Áreas Con Rezago"
            [value]="store.resumen().data?.areasConRezago ?? 0"
            description="Áreas con reporte atrasado o sin actualización reciente."
            badgeLabel="Rezago"
            badgeVariant="danger"
            tone="danger">
          </app-kpi-card>
        </section>
      </app-async-state-wrapper>

      <app-compliance-monitor
        [items]="store.cumplimiento().data"
        [meta]="store.cumplimientoMeta()"
        [loading]="store.cumplimiento().loading"
        [error]="store.cumplimiento().error"
        (pageChange)="store.cargarCumplimiento($event)"
        (retry)="store.cargarCumplimiento(store.cumplimientoMeta().page)">
      </app-compliance-monitor>

      <app-extemporaneous-alerts
        [items]="store.alertas().data"
        [loading]="store.alertas().loading"
        [error]="store.alertas().error"
        [updatedAt]="store.alertasActualizadas()"
        (viewDetail)="abrirDetalle($event)"
        (retry)="store.cargarAlertas(store.alertasMeta().page)">
      </app-extemporaneous-alerts>
    </div>

    <!-- Detalle y validación de alerta -->
    <app-modal
      [isOpen]="!!alertaSeleccionada()"
      title="Detalle de modificación extemporánea"
      [subtitle]="alertaSeleccionada()?.area ?? ''"
      size="md"
      [trapFocus]="true"
      (modalClose)="cerrarDetalle()">
      @if (alertaSeleccionada(); as a) {
        <app-details-coordination [items]="detalleItems()"></app-details-coordination>

        @if (a.estatus === 'pendiente') {
          <div class="mt-5 flex flex-col gap-3">
            <app-input-enhanced
              label="Folio de memorándum u oficio"
              placeholder="SEMOVI/XXX/000/2026"
              [control]="folio"
              [fullWidth]="true"
              [optional]="true">
            </app-input-enhanced>
            <app-input-enhanced
              label="Observaciones"
              type="textarea"
              [rows]="3"
              [control]="observaciones"
              [fullWidth]="true"
              [optional]="true">
            </app-input-enhanced>
          </div>
        }
      }

      <div slot="footer" class="flex justify-end gap-2">
        <app-institutional-button [config]="{ variant: 'secondary', size: 'sm' }" (clicked)="cerrarDetalle()">
          Cerrar
        </app-institutional-button>
        @if (alertaSeleccionada()?.estatus === 'pendiente') {
          <app-institutional-button
            [config]="{ variant: 'primary', size: 'sm', icon: 'task_alt', iconPosition: 'left', loading: validando(), disabled: validando() }"
            (clicked)="validar()">
            Validar
          </app-institutional-button>
        }
      </div>
    </app-modal>
  `,
})
export class InicioCoordinacionComponent implements OnInit {
  protected readonly store = inject(InicioCoordinacionStore);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = new DatePipe('en-US');

  readonly secciones: PillTab[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'dialogo', label: 'Diálogo y concertación', disabled: true, hint: 'Próximamente' },
    { id: 'reportes', label: 'Reportes', disabled: true, hint: 'Próximamente' },
    { id: 'administracion', label: 'Administración', disabled: true, hint: 'Próximamente' },
  ];

  /** Detalle de la alerta seleccionada para el modal. */
  readonly detalleItems = computed<DetailItem[]>(() => {
    const a = this.alertaSeleccionada();
    if (!a) return [];
    const estatus = ESTATUS_ALERTA_MAP[a.estatus];
    return [
      { label: 'Fecha y hora', value: this.datePipe.transform(a.fechaHora, "dd/MM/yyyy '·' HH:mm") },
      { label: 'Semana afectada', value: `Semana ${a.semanaAfectada}` },
      { label: 'Estatus', value: estatus.label, badge: { variant: estatus.variant } },
      { label: 'Memorándum / Oficio', value: a.folio || 'Sin folio registrado', mono: true },
      ...(a.descripcion ? [{ label: 'Descripción', value: a.descripcion, fullWidth: true }] : []),
    ];
  });
  private readonly currentUser = inject(CurrentUserService);
  protected readonly userName = this.currentUser.fullName;
  protected readonly areaName = this.currentUser.areaName;
  readonly seccionActiva = signal('inicio');
  readonly alertaSeleccionada = signal<AlertaModificacionDto | null>(null);
  readonly validando = signal(false);
  readonly folio = new FormControl('', { nonNullable: true });
  readonly observaciones = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.store.cargarTodo();
  }

  abrirDetalle(alerta: AlertaModificacionDto): void {
    this.folio.reset(alerta.folio ?? '');
    this.observaciones.reset('');
    this.alertaSeleccionada.set(alerta);
  }

  cerrarDetalle(): void {
    this.alertaSeleccionada.set(null);
  }

  validar(): void {
    const alerta = this.alertaSeleccionada();
    if (!alerta || this.validando()) return;
    this.validando.set(true);
    this.store.validarAlerta(alerta.id, {
      folio: this.folio.value.trim() || null,
      observaciones: this.observaciones.value.trim() || null,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.validando.set(false);
          this.cerrarDetalle();
          this.notifications.success('Alerta validada', 'La modificación quedó registrada como recibida.');
        },
        error: (e: { message?: string }) => {
          this.validando.set(false);
          this.notifications.error('No se pudo validar', e?.message ?? 'Intenta de nuevo.');
        },
      });
  }
}
