import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl } from '@angular/forms';
import { InputComponent } from '@/app/shared/components/inputs/input-wrapper/input.component';
import { ModalComponent } from '@/app/shared/components/modals/modal/modal.component';
import { EntityStatusPillComponent } from '@/app/shared/components/entity-status-pill/entity-status-pill.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { AlertaModificacionDto, ValidarAlertaDto } from '../../models/inicio-coordinacion.models';
import { ESTATUS_ALERTA_MAP, FORMATO_FECHA_HORA } from '../../models/inicio-coordinacion.estatus';

/** Detalle de una alerta y validación (registro de folio/observaciones). */
@Component({
  selector: 'app-alerta-detalle-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, InputComponent, ModalComponent, EntityStatusPillComponent, InstitutionalButtonComponent],
  template: `
    <app-modal
      [isOpen]="!!alerta()"
      title="Detalle de modificación extemporánea"
      [subtitle]="alerta()?.area ?? ''"
      size="md"
      [trapFocus]="true"
      (modalClose)="cerrar.emit()">
      @if (alerta(); as a) {
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-xs uppercase tracking-wide text-gray-500">Fecha y hora</dt>
            <dd class="font-semibold text-gray-900">{{ a.fechaHora | date: formatoFecha }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-gray-500">Semana afectada</dt>
            <dd class="font-semibold text-gray-900">Semana {{ a.semanaAfectada }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-gray-500">Estatus</dt>
            <dd><app-entity-status-pill [status]="a.estatus" [map]="estatusMap"></app-entity-status-pill></dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-gray-500">Memorándum / Oficio</dt>
            <dd class="font-mono text-xs text-gray-900">{{ a.folio || 'Sin folio registrado' }}</dd>
          </div>
          @if (a.descripcion) {
            <div class="sm:col-span-2">
              <dt class="text-xs uppercase tracking-wide text-gray-500">Descripción</dt>
              <dd class="text-gray-700">{{ a.descripcion }}</dd>
            </div>
          }
        </dl>

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
        <app-institutional-button [config]="{ variant: 'secondary', size: 'sm' }" (clicked)="cerrar.emit()">
          Cerrar
        </app-institutional-button>
        @if (alerta()?.estatus === 'pendiente') {
          <app-institutional-button
            [config]="{ variant: 'primary', size: 'sm', icon: 'task_alt', iconPosition: 'left', loading: guardando(), disabled: guardando() }"
            (clicked)="enviar(alerta()!)">
            Validar
          </app-institutional-button>
        }
      </div>
    </app-modal>
  `,
})
export class AlertaDetalleModalComponent {
  readonly alerta = input<AlertaModificacionDto | null>(null);
  readonly guardando = input(false);
  readonly validar = output<{ id: string; body: ValidarAlertaDto }>();
  readonly cerrar = output<void>();

  readonly estatusMap = ESTATUS_ALERTA_MAP;
  readonly formatoFecha = FORMATO_FECHA_HORA;
  readonly folio = new FormControl('', { nonNullable: true });
  readonly observaciones = new FormControl('', { nonNullable: true });

  constructor() {
    // Reinicia el formulario cada vez que se abre otra alerta.
    effect(() => {
      const a = this.alerta();
      this.folio.reset(a?.folio ?? '');
      this.observaciones.reset('');
    });
  }

  enviar(a: AlertaModificacionDto): void {
    if (this.guardando()) return;
    this.validar.emit({
      id: a.id,
      body: {
        folio: this.folio.value.trim() || null,
        observaciones: this.observaciones.value.trim() || null,
      },
    });
  }
}
