import { ChangeDetectionStrategy, Component, input, OnInit, output, TemplateRef, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PaginationMeta } from '@/app/core/models/dto';
import { AsyncStateWrapperComponent } from '@/app/shared/components/async-state-wrapper/async-state-wrapper.component';
import { EntityStatusPillComponent } from '@/app/shared/components/entity-status-pill/entity-status-pill.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { InstitutionalTableComponent, TableColumn } from '@/app/shared/components/tables';
import { CumplimientoSemanalDto } from '../../models/inicio-coordinacion.models';
import { ESTATUS_CUMPLIMIENTO_MAP, FORMATO_FECHA_HORA } from '../../models/inicio-coordinacion.estatus';

/** Tabla paginada del cumplimiento semanal por área. */
@Component({
  selector: 'app-monitor-cumplimiento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    AsyncStateWrapperComponent,
    EntityStatusPillComponent,
    InstitutionalButtonComponent,
    InstitutionalTableComponent,
  ],
  template: `
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5" aria-labelledby="monitor-titulo">
      <header class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div>
          <h2 id="monitor-titulo" class="text-lg font-bold text-gray-900">Monitor de Cumplimiento Semanal</h2>
          <p class="text-xs text-gray-500">
            Subconjunto de {{ items().length }} áreas · Total: {{ meta().total }} áreas institucionales
          </p>
        </div>
        <ul class="flex flex-wrap gap-2" aria-label="Simbología de estatus">
          @for (estatus of leyenda; track estatus) {
            <li><app-entity-status-pill [status]="estatus" [map]="estatusMap"></app-entity-status-pill></li>
          }
        </ul>
      </header>

      <app-async-state-wrapper
        [loading]="loading() && items().length === 0"
        [hasError]="!!error()"
        [errorMessage]="error() ?? ''"
        [empty]="!loading() && items().length === 0"
        emptyIcon="fact_check"
        emptyTitle="Sin áreas registradas"
        emptySubtitle="Aún no hay reportes semanales para mostrar."
        skeletonVariant="table"
        (retry)="retry.emit()">
        <div [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
          <app-institutional-table
            [data]="items()"
            [columns]="columns"
            [config]="{ variant: 'compact', hoverable: true, localSort: false }">
          </app-institutional-table>
        </div>

        <footer class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <p class="text-xs text-gray-500" aria-live="polite">
            Mostrando {{ items().length }} de {{ meta().total }} áreas · Página {{ meta().page }} de {{ meta().totalPages }}
          </p>
          <div class="flex gap-2">
            <app-institutional-button
              [config]="{ variant: 'secondary', size: 'sm', disabled: !meta().hasPrev || loading(), ariaLabel: 'Página anterior' }"
              (clicked)="pageChange.emit(meta().page - 1)">
              Anterior
            </app-institutional-button>
            <app-institutional-button
              [config]="{ variant: 'primary', size: 'sm', disabled: !meta().hasNext || loading(), ariaLabel: 'Página siguiente' }"
              (clicked)="pageChange.emit(meta().page + 1)">
              Siguiente
            </app-institutional-button>
          </div>
        </footer>
      </app-async-state-wrapper>
    </section>

    <ng-template #areaTpl let-item>
      <span class="font-semibold text-gray-900">{{ item.area }}</span>
    </ng-template>
    <ng-template #semanaTpl let-item>Semana {{ item.semanaReportada }}</ng-template>
    <ng-template #fechaTpl let-item>{{ item.ultimaActualizacion | date: formatoFecha }}</ng-template>
    <ng-template #estatusTpl let-item>
      <app-entity-status-pill [status]="item.estatus" [map]="estatusMap"></app-entity-status-pill>
    </ng-template>
  `,
})
export class MonitorCumplimientoComponent implements OnInit {
  readonly items = input<CumplimientoSemanalDto[]>([]);
  readonly meta = input.required<PaginationMeta>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly pageChange = output<number>();
  readonly retry = output<void>();

  @ViewChild('areaTpl', { static: true }) private areaTpl!: TemplateRef<unknown>;
  @ViewChild('semanaTpl', { static: true }) private semanaTpl!: TemplateRef<unknown>;
  @ViewChild('fechaTpl', { static: true }) private fechaTpl!: TemplateRef<unknown>;
  @ViewChild('estatusTpl', { static: true }) private estatusTpl!: TemplateRef<unknown>;

  readonly estatusMap = ESTATUS_CUMPLIMIENTO_MAP;
  readonly leyenda = Object.keys(ESTATUS_CUMPLIMIENTO_MAP);
  readonly formatoFecha = FORMATO_FECHA_HORA;

  columns: TableColumn[] = [];

  ngOnInit(): void {
    this.columns = [
      { key: 'area', label: 'Área operativa', template: this.areaTpl },
      { key: 'responsable', label: 'Responsable' },
      { key: 'semanaReportada', label: 'Semana reportada', template: this.semanaTpl },
      { key: 'ultimaActualizacion', label: 'Última actualización', template: this.fechaTpl },
      { key: 'estatus', label: 'Estatus', template: this.estatusTpl },
    ];
  }
}
