import { ChangeDetectionStrategy, Component, input, OnInit, output, TemplateRef, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AsyncStateWrapperComponent } from '@/app/shared/components/async-state-wrapper/async-state-wrapper.component';
import { EntityStatusPillComponent } from '@/app/shared/components/entity-status-pill/entity-status-pill.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { InstitutionalTableComponent, TableColumn } from '@/app/shared/components/tables';
import { AlertaModificacionDto, ESTATUS_ALERTA_MAP } from '../../models/alert-validation.model';

/** Alertas de Modificaciones Extemporáneas: cambios en semanas ya cerradas. */
@Component({
  selector: 'app-extemporaneous-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AsyncStateWrapperComponent, EntityStatusPillComponent, InstitutionalButtonComponent, InstitutionalTableComponent],
  template: `
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5" aria-labelledby="alertas-titulo">
      <header class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div>
          <h2 id="alertas-titulo" class="text-lg font-bold text-gray-900">Alertas de Modificaciones Extemporáneas</h2>
          <p class="text-xs text-gray-500">
            Cambios detectados en semanas pasadas
            @if (updatedAt(); as fecha) { · Actualizado al {{ fecha | date: 'dd/MM/yyyy' }} }
          </p>
        </div>
        <ul class="flex flex-wrap gap-2" aria-label="Simbología de estatus">
          @for (e of leyenda; track e) {
            <li><app-entity-status-pill [status]="e" [map]="estatusMap"></app-entity-status-pill></li>
          }
        </ul>
      </header>

      <app-async-state-wrapper
        [loading]="loading() && items().length === 0"
        [hasError]="!!error()"
        [errorMessage]="error() ?? ''"
        [empty]="!loading() && items().length === 0"
        emptyIcon="notifications_off"
        emptyTitle="Sin alertas"
        emptySubtitle="No se han detectado modificaciones extemporáneas."
        skeletonVariant="table"
        (retry)="retry.emit()">
        <app-institutional-table
          [data]="items()"
          [columns]="columns"
          [config]="{ variant: 'compact', hoverable: true, localSort: false }">
        </app-institutional-table>
      </app-async-state-wrapper>
    </section>

    <ng-template #areaTpl let-item>
      <span class="font-semibold text-gray-900">{{ item.area }}</span>
    </ng-template>
    <ng-template #fechaTpl let-item>{{ item.fechaHora | date: "dd/MM/yyyy '·' HH:mm" }}</ng-template>
    <ng-template #semanaTpl let-item>Semana {{ item.semanaAfectada }}</ng-template>
    <ng-template #folioTpl let-item>
      @if (item.folio) {
        <span class="font-mono text-xs font-semibold text-gray-900">{{ item.folio }}</span>
      } @else {
        <span class="font-mono text-xs text-gray-500">Sin folio registrado</span>
      }
    </ng-template>
    <ng-template #estatusTpl let-item>
      <app-entity-status-pill [status]="item.estatus" [map]="estatusMap"></app-entity-status-pill>
    </ng-template>
    <ng-template #accionesTpl let-item>
      <app-institutional-button
        [config]="{ variant: 'secondary', size: 'sm', icon: 'visibility', iconPosition: 'left', ariaLabel: 'Validar o ver detalle de ' + item.area }"
        (clicked)="viewDetail.emit(item)">
        Validar / Ver Detalle
      </app-institutional-button>
    </ng-template>
  `,
})
export class ExtemporaneousAlertsComponent implements OnInit {
  readonly items = input<AlertaModificacionDto[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly updatedAt = input<Date | null>(null);
  readonly viewDetail = output<AlertaModificacionDto>();
  readonly retry = output<void>();

  @ViewChild('areaTpl', { static: true }) private areaTpl!: TemplateRef<unknown>;
  @ViewChild('fechaTpl', { static: true }) private fechaTpl!: TemplateRef<unknown>;
  @ViewChild('semanaTpl', { static: true }) private semanaTpl!: TemplateRef<unknown>;
  @ViewChild('folioTpl', { static: true }) private folioTpl!: TemplateRef<unknown>;
  @ViewChild('estatusTpl', { static: true }) private estatusTpl!: TemplateRef<unknown>;
  @ViewChild('accionesTpl', { static: true }) private accionesTpl!: TemplateRef<unknown>;

  readonly estatusMap = ESTATUS_ALERTA_MAP;
  readonly leyenda = Object.keys(ESTATUS_ALERTA_MAP);
  columns: TableColumn[] = [];

  ngOnInit(): void {
    this.columns = [
      { key: 'area', label: 'Área', template: this.areaTpl },
      { key: 'fechaHora', label: 'Fecha y hora', template: this.fechaTpl },
      { key: 'semanaAfectada', label: 'Semana afectada', template: this.semanaTpl },
      { key: 'folio', label: 'Memorándum / Oficio', template: this.folioTpl },
      { key: 'estatus', label: 'Estatus', template: this.estatusTpl },
      { key: 'acciones', label: 'Acciones', template: this.accionesTpl },
    ];
  }
}
