import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AvatarComponent } from '@/app/shared/components/avatar/avatar.component';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import { OidcAuthService } from '@/app/core/auth';
import { AlertaModificacionDto, ValidarAlertaDto } from './models/inicio-coordinacion.models';
import { InicioCoordinacionStore } from './services/inicio-coordinacion.store';
import { ResumenAreasComponent } from './components/resumen-areas/resumen-areas.component';
import { MonitorCumplimientoComponent } from './components/monitor-cumplimiento/monitor-cumplimiento.component';
import { AlertasModificacionesComponent } from './components/alertas-modificaciones/alertas-modificaciones.component';
import { AlertaDetalleModalComponent } from './components/alerta-detalle-modal/alerta-detalle-modal.component';

interface SeccionNav {
  id: string;
  label: string;
  disponible: boolean;
}

/** Pantalla de inicio de la Coordinación Técnica (SISER 2.0). */
@Component({
  selector: 'app-inicio-coordinacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AvatarComponent,
    ResumenAreasComponent,
    MonitorCumplimientoComponent,
    AlertasModificacionesComponent,
    AlertaDetalleModalComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <header class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900">SISER 2.0</h1>
          <p class="text-xs text-gray-500">Coordinación Técnica · Supervisión institucional</p>
        </div>
        <div class="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2 self-start sm:self-auto">
          <app-avatar [name]="usuario.nombre" [config]="{ size: 'sm', variant: 'primary' }"></app-avatar>
          <div class="leading-tight">
            <p class="text-sm font-semibold text-gray-900">{{ usuario.area }}</p>
            <p class="text-xs text-gray-500">{{ usuario.nombre }}</p>
          </div>
        </div>
      </header>

      <nav class="bg-white rounded-xl shadow-sm border border-gray-100 p-2" aria-label="Secciones de coordinación">
        <ul class="flex flex-wrap gap-2">
          @for (s of secciones; track s.id) {
            <li>
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional-guinda"
                [class]="s.id === seccionActiva()
                  ? 'bg-institucional-guinda text-white border-institucional-guinda'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
                [attr.aria-current]="s.id === seccionActiva() ? 'page' : null"
                [disabled]="!s.disponible"
                [title]="s.disponible ? s.label : 'Próximamente'"
                (click)="seccionActiva.set(s.id)">
                {{ s.label }}
              </button>
            </li>
          }
        </ul>
      </nav>

      <app-resumen-areas
        [resumen]="store.resumen().data"
        [loading]="store.resumen().loading"
        [error]="store.resumen().error"
        (retry)="store.cargarResumen()">
      </app-resumen-areas>

      <app-monitor-cumplimiento
        [items]="store.cumplimiento().data"
        [meta]="store.cumplimientoMeta()"
        [loading]="store.cumplimiento().loading"
        [error]="store.cumplimiento().error"
        (pageChange)="store.cargarCumplimiento($event)"
        (retry)="store.cargarCumplimiento(store.cumplimientoMeta().page)">
      </app-monitor-cumplimiento>

      <app-alertas-modificaciones
        [items]="store.alertas().data"
        [loading]="store.alertas().loading"
        [error]="store.alertas().error"
        [actualizado]="store.alertasActualizadas()"
        (verDetalle)="alertaSeleccionada.set($event)"
        (retry)="store.cargarAlertas(store.alertasMeta().page)">
      </app-alertas-modificaciones>
    </div>

    <app-alerta-detalle-modal
      [alerta]="alertaSeleccionada()"
      [guardando]="validando()"
      (validar)="onValidar($event)"
      (cerrar)="alertaSeleccionada.set(null)">
    </app-alerta-detalle-modal>
  `,
})
export class InicioCoordinacionComponent implements OnInit {
  protected readonly store = inject(InicioCoordinacionStore);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(OidcAuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly secciones: SeccionNav[] = [
    { id: 'inicio', label: 'Inicio', disponible: true },
    { id: 'dialogo', label: 'Diálogo y concertación', disponible: false },
    { id: 'reportes', label: 'Reportes', disponible: false },
    { id: 'administracion', label: 'Administración', disponible: false },
  ];

  readonly seccionActiva = signal('inicio');
  readonly alertaSeleccionada = signal<AlertaModificacionDto | null>(null);
  readonly validando = signal(false);
  readonly usuario = this.resolverUsuario();

  ngOnInit(): void {
    this.store.cargarTodo();
  }

  onValidar({ id, body }: { id: string; body: ValidarAlertaDto }): void {
    this.validando.set(true);
    this.store.validarAlerta(id, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.validando.set(false);
          this.alertaSeleccionada.set(null);
          this.notifications.success('Alerta validada', 'La modificación quedó registrada como recibida.');
        },
        error: (e: { message?: string }) => {
          this.validando.set(false);
          this.notifications.error('No se pudo validar', e?.message ?? 'Intenta de nuevo.');
        },
      });
  }

  private resolverUsuario(): { nombre: string; area: string } {
    const user = this.auth.getCurrentUser();
    const emp = user?.employee;
    const nombre = emp
      ? [emp.firstName, emp.lastName].filter(Boolean).join(' ')
      : user?.email?.split('@')[0] ?? 'Coordinación Técnica';
    return { nombre, area: emp?.area?.name ?? 'Coordinación Técnica' };
  }
}
