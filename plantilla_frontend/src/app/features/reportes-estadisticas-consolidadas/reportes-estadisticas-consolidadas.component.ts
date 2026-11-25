import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal, TemplateRef, ViewChild,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PaginationMeta } from '@/app/core/models/dto';
import { AsyncStateWrapperComponent } from '@/app/shared/components/async-state-wrapper/async-state-wrapper.component';
import { EntityStatusPillComponent } from '@/app/shared/components/entity-status-pill/entity-status-pill.component';
import { InputComponent } from '@/app/shared/components/inputs/input-wrapper/input.component';
import { SelectComponent, SelectOption } from '@/app/shared/components/inputs/select/select.component';
import { InstitutionalBadgeComponent } from '@/app/shared/components/badge';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { InstitutionalTableComponent, PageChangeEvent, TableColumn, TablePaginationComponent } from '@/app/shared/components/tables';
import { ExportService } from '@/app/shared/lib/export/export.service';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import {
  CatalogosReporteDto,
  CONDICION_FISCAL_MAP,
  EstadisticasReporteDto,
  ESTADO_REGISTRO_MAP,
  EstimuloFiscalFiltro,
  FiltrosReporteDto,
  RegistroReporteDto,
} from '../models/reportes-estadisticas-consolidadas.model';
import { ReportesDataSource } from '../services/reportes-estadisticas-consolidadas.service';

const PAGE_SIZE = 10;
const TODOS = '';

const FILTROS_INICIALES = {
  fechaInicio: '2026-01-01',
  fechaFin: '2026-10-31',
  semana: TODOS,
  areaId: TODOS,
  actividad: '',
  regionId: TODOS,
  municipio: '',
  estimuloFiscal: 'todos' as EstimuloFiscalFiltro,
};

const EMPTY_META: PaginationMeta = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1, hasNext: false, hasPrev: false };

interface Kpi {
  titulo: string;
  valor: string;
  pie: string;
  badge?: { texto: string; variant: 'success' | 'primary' | 'danger' | 'ghost' };
}

/** 128450 → 128.4k */
function compacto(n: number): string {
  return n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1)}k` : String(n);
}

function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 1000) / 10 : 0;
}

/**
 * Reportes y Estadísticas Consolidadas (SISER 2.0).
 * Consola de análisis operacional, generación de KPIs y exportación oficial.
 */
@Component({
  selector: 'app-reportes-estadisticas-consolidadas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    AsyncStateWrapperComponent,
    EntityStatusPillComponent,
    InputComponent,
    InstitutionalBadgeComponent,
    InstitutionalButtonComponent,
    InstitutionalTableComponent,
    SelectComponent,
    TablePaginationComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <!-- ===== Encabezado ===== -->
      <header class="bg-white rounded-xl shadow-sm border border-gray-100 px-5 pt-5">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 class="text-xl font-bold text-gray-900">Reportes y Estadísticas Consolidadas</h1>
            <p class="text-xs text-gray-500">Consola de análisis operacional, generación de KPIs y exportación oficial.</p>
          </div>
          <app-institutional-button
            [config]="{ variant: 'secondary', size: 'sm', icon: 'description', iconPosition: 'left', loading: exportando(), disabled: exportando() }"
            (clicked)="exportarExcel()">
            Exportar Excel (.xlsx)
          </app-institutional-button>
        </div>
        <nav class="mt-4 -mb-px" aria-label="Secciones">
          <ul class="flex flex-wrap gap-6 text-xs font-semibold uppercase tracking-wide">
            <li><a routerLink="/coordinacion" class="inline-block pb-3 text-gray-600 hover:text-gray-900">Inicio</a></li>
            <li><span class="inline-block pb-3 text-gray-400 cursor-not-allowed" title="Próximamente">Diálogo y concertación</span></li>
            <li><span class="inline-block pb-3 text-institucional-guinda border-b-2 border-institucional-guinda" aria-current="page">Reportes</span></li>
            <li><span class="inline-block pb-3 text-gray-400 cursor-not-allowed" title="Próximamente">Administración</span></li>
          </ul>
        </nav>
      </header>

      <!-- ===== Filtros ===== -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-100" aria-labelledby="filtros-titulo">
        <button
          type="button"
          class="w-full flex items-center justify-between px-5 py-4 text-left"
          [attr.aria-expanded]="filtrosAbiertos()"
          aria-controls="filtros-panel"
          (click)="filtrosAbiertos.set(!filtrosAbiertos())">
          <h2 id="filtros-titulo" class="text-sm font-bold text-gray-900">Filtros de Búsqueda</h2>
          <span class="material-symbols-outlined text-gray-500" aria-hidden="true">{{ filtrosAbiertos() ? 'expand_less' : 'expand_more' }}</span>
        </button>

        @if (filtrosAbiertos()) {
          <div id="filtros-panel" class="px-5 pb-5 flex flex-col gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <fieldset class="flex flex-col gap-1">
                <legend class="text-xs font-medium text-gray-700 mb-1">Rango de Fechas</legend>
                <div class="grid grid-cols-2 gap-2">
                  <app-input-enhanced type="date" ariaLabel="Fecha inicial" [control]="filtros.controls.fechaInicio" size="sm" [fullWidth]="true"></app-input-enhanced>
                  <app-input-enhanced type="date" ariaLabel="Fecha final" [control]="filtros.controls.fechaFin" size="sm" [fullWidth]="true"></app-input-enhanced>
                </div>
              </fieldset>
              <app-select label="Semana" [control]="filtros.controls.semana" [options]="opcionesSemana" [allowEmpty]="false" size="sm"></app-select>
              <app-select label="Dirección / Área" [control]="filtros.controls.areaId" [options]="opcionesArea()" [allowEmpty]="false" size="sm"></app-select>
              <app-input-enhanced
                label="Actividad Específica"
                placeholder="Seleccionar actividad..."
                iconLeft="search"
                [control]="filtros.controls.actividad"
                size="sm"
                [fullWidth]="true">
              </app-input-enhanced>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
              <app-select label="Región" [control]="filtros.controls.regionId" [options]="opcionesRegion()" [allowEmpty]="false" size="sm"></app-select>
              <app-input-enhanced
                label="Municipio"
                [placeholder]="(catalogos()?.totalMunicipios ?? '') + ' Municipios...'"
                iconLeft="search"
                [control]="filtros.controls.municipio"
                size="sm"
                [fullWidth]="true">
              </app-input-enhanced>
              <app-select label="Estímulo Fiscal" [control]="filtros.controls.estimuloFiscal" [options]="opcionesEstimulo" [allowEmpty]="false" size="sm"></app-select>
              <div class="flex gap-2 justify-end">
                <app-institutional-button [config]="{ variant: 'primary', size: 'sm', icon: 'search', iconPosition: 'left' }" (clicked)="aplicarFiltros()">
                  Aplicar Filtros
                </app-institutional-button>
                <app-institutional-button [config]="{ variant: 'secondary', size: 'sm', icon: 'refresh', iconPosition: 'left' }" (clicked)="limpiarFiltros()">
                  Limpiar
                </app-institutional-button>
              </div>
            </div>
          </div>
        }
      </section>

      <!-- ===== KPIs y gráficas ===== -->
      <app-async-state-wrapper
        [loading]="cargandoEstadisticas() && !estadisticas()"
        [hasError]="!!errorEstadisticas()"
        [errorMessage]="errorEstadisticas() ?? ''"
        skeletonVariant="card"
        (retry)="cargarEstadisticas()">
        <div class="flex flex-col gap-4" [class.opacity-60]="cargandoEstadisticas()" [attr.aria-busy]="cargandoEstadisticas()">
          <section class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" aria-label="Indicadores clave">
            @for (k of kpis(); track k.titulo) {
              <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
                <header class="flex items-start justify-between gap-2">
                  <h3 class="text-xs text-gray-600">{{ k.titulo }}</h3>
                  @if (k.badge) {
                    <app-institutional-badge [config]="{ variant: k.badge.variant, size: 'sm' }">{{ k.badge.texto }}</app-institutional-badge>
                  }
                </header>
                <p class="text-2xl font-bold text-gray-900">{{ k.valor }}</p>
                <p class="text-xs text-gray-500">{{ k.pie }}</p>
              </article>
            }
          </section>

          <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <!-- Comparativo de actividades -->
            <section class="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5" aria-labelledby="comparativo-titulo">
              <header class="flex items-center justify-between mb-4">
                <h2 id="comparativo-titulo" class="text-sm font-bold text-gray-900">Comparativo de Actividades por Semana / Mes</h2>
                <span class="material-symbols-outlined text-gray-400" aria-hidden="true">bar_chart</span>
              </header>
              <div class="flex items-end gap-3 h-56" role="img" [attr.aria-label]="descripcionSerie(estadisticas()?.comparativo)">
                @for (p of estadisticas()?.comparativo ?? []; track p.etiqueta; let i = $index) {
                  <div class="flex-1 h-full flex flex-col justify-end items-center gap-1" [title]="p.etiqueta + ': ' + (p.valor | number)">
                    <div class="w-full rounded-t-md" [class]="i % 2 === 0 ? 'bg-blue-600' : 'bg-blue-400'" [style.height.%]="altura(p.valor, maxComparativo())"></div>
                    <span class="text-xs text-gray-500">{{ p.etiqueta }}</span>
                  </div>
                }
              </div>
            </section>

            <!-- Desglose por género -->
            <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5" aria-labelledby="genero-titulo">
              <header class="flex items-center justify-between mb-4">
                <h2 id="genero-titulo" class="text-sm font-bold text-gray-900">Desglose por Perspectiva de Género</h2>
                <span class="material-symbols-outlined text-gray-400" aria-hidden="true">pie_chart</span>
              </header>
              <div class="flex flex-col items-center gap-4">
                <div class="relative w-40 h-40">
                  <svg viewBox="0 0 42 42" class="w-full h-full -rotate-90" role="img" [attr.aria-label]="'Hombres ' + genero().h + '%, Mujeres ' + genero().m + '%, Otro ' + genero().o + '%'">
                    <circle cx="21" cy="21" r="15.915" fill="none" class="stroke-gray-100" stroke-width="5"></circle>
                    <circle cx="21" cy="21" r="15.915" fill="none" class="stroke-blue-600" stroke-width="5"
                      [attr.stroke-dasharray]="genero().h + ' ' + (100 - genero().h)" stroke-dashoffset="0"></circle>
                    <circle cx="21" cy="21" r="15.915" fill="none" class="stroke-pink-500" stroke-width="5"
                      [attr.stroke-dasharray]="genero().m + ' ' + (100 - genero().m)" [attr.stroke-dashoffset]="-genero().h"></circle>
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-xl font-bold text-gray-900">{{ totalGeneroCompacto() }}</span>
                    <span class="text-xs text-gray-500">Total</span>
                  </div>
                </div>
                <ul class="self-start text-xs text-gray-700 flex flex-col gap-1">
                  <li class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm bg-blue-600"></span>Hombres ({{ genero().h }}%)</li>
                  <li class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm bg-pink-500"></span>Mujeres ({{ genero().m }}%)</li>
                  <li class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm bg-gray-200"></span>Otro (O) {{ genero().o }}%</li>
                </ul>
              </div>
            </section>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <!-- Top regiones -->
            <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5" aria-labelledby="regiones-titulo">
              <header class="flex items-center justify-between mb-4">
                <h2 id="regiones-titulo" class="text-sm font-bold text-gray-900">Top Regiones con Mayor Operatividad</h2>
                <span class="material-symbols-outlined text-gray-400" aria-hidden="true">bar_chart</span>
              </header>
              <ul class="flex flex-col gap-4">
                @for (r of estadisticas()?.topRegiones ?? []; track r.etiqueta; let i = $index) {
                  <li>
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-gray-700">{{ r.etiqueta }}</span>
                      <span class="font-semibold text-gray-900">{{ r.valor | number }}</span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-gray-100" role="progressbar"
                      [attr.aria-valuenow]="r.valor" aria-valuemin="0" [attr.aria-valuemax]="maxRegiones()" [attr.aria-label]="r.etiqueta">
                      <div class="h-1.5 rounded-full" [class]="tonoRegion(i)" [style.width.%]="altura(r.valor, maxRegiones())"></div>
                    </div>
                  </li>
                }
              </ul>
            </section>

            <!-- Tendencia temporal -->
            <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5" aria-labelledby="tendencia-titulo">
              <header class="flex items-center justify-between mb-4">
                <h2 id="tendencia-titulo" class="text-sm font-bold text-gray-900">Tendencia Temporal de Trámites Atendidos</h2>
                <span class="material-symbols-outlined text-gray-400" aria-hidden="true">trending_up</span>
              </header>
              <div class="flex items-end justify-around h-40 border-b border-gray-100" role="img" [attr.aria-label]="descripcionSerie(estadisticas()?.tendencia)">
                @for (p of estadisticas()?.tendencia ?? []; track p.etiqueta) {
                  <div class="w-0.5 bg-blue-700" [style.height.%]="altura(p.valor, maxTendencia())" [title]="p.etiqueta + ': ' + (p.valor | number)"></div>
                }
              </div>
            </section>
          </div>
        </div>
      </app-async-state-wrapper>

      <!-- ===== Registros ===== -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5" aria-labelledby="registros-titulo">
        <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <h2 id="registros-titulo" class="text-sm font-bold text-gray-900">Vista Previa de Registros Filtrados</h2>
            @if (esDemo) {
              <app-institutional-badge [config]="{ variant: 'ghost', size: 'sm' }">Datos de ejemplo</app-institutional-badge>
            }
          </div>
          <div class="w-full sm:w-72">
            <app-input-enhanced placeholder="Buscar por Folio o Municipio..." iconLeft="search" ariaLabel="Buscar por folio o municipio" [control]="busqueda" size="sm" [fullWidth]="true"></app-input-enhanced>
          </div>
        </header>

        <app-async-state-wrapper
          [loading]="cargandoRegistros() && registros().length === 0"
          [hasError]="!!errorRegistros()"
          [errorMessage]="errorRegistros() ?? ''"
          [empty]="!cargandoRegistros() && registros().length === 0"
          emptyIcon="search_off"
          emptyTitle="Sin registros"
          emptySubtitle="No hay registros que coincidan con los filtros aplicados."
          skeletonVariant="table"
          (retry)="cargarRegistros(meta().page)">
          <div [class.opacity-60]="cargandoRegistros()" [attr.aria-busy]="cargandoRegistros()">
            <app-institutional-table
              [data]="registros()"
              [columns]="columnas"
              [config]="{ variant: 'compact', hoverable: true, localSort: false }">
            </app-institutional-table>
          </div>
          <footer class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mt-3">
            <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Mostrando {{ rangoInicio() }}-{{ rangoFin() }} de {{ meta().total | number }} registros</span>
              <app-entity-status-pill status="con_estimulo" [map]="condicionFiscal"></app-entity-status-pill><span>Fiscal</span>
              <app-entity-status-pill status="sin_estimulo" [map]="condicionFiscal"></app-entity-status-pill><span>Fiscal</span>
            </div>
            <app-table-pagination
              [config]="{ pageSize: pageSize, totalItems: meta().total, currentPage: meta().page, showInfo: false, maxVisiblePages: 3 }"
              [showPageSizeSelector]="false"
              (pageChange)="onPageChange($event)">
            </app-table-pagination>
          </footer>
        </app-async-state-wrapper>
      </section>
    </div>

    <!-- ===== Plantillas de celdas ===== -->
    <ng-template #numTpl let-item let-column="column">{{ $any(item)[column.key] | number }}</ng-template>
    <ng-template #otrosTpl let-item><span class="text-gray-400">{{ item.otros | number }}</span></ng-template>
    <ng-template #totalTpl let-item><span class="font-semibold text-gray-900">{{ item.total | number }}</span></ng-template>
    <ng-template #fechaTpl let-item>{{ item.fechaRegistro | date: 'dd/MM/yyyy' }}</ng-template>
    <ng-template #fiscalTpl let-item>
      <app-entity-status-pill [status]="item.condicionFiscal" [map]="condicionFiscal"></app-entity-status-pill>
    </ng-template>
    <ng-template #estadoTpl let-item>
      <app-entity-status-pill [status]="item.estado" [map]="estadoRegistro"></app-entity-status-pill>
    </ng-template>
  `,
})
export class ReportesEstadisticasConsolidadasComponent implements OnInit {
  private readonly dataSource = inject(ReportesDataSource);
  private readonly exportService = inject(ExportService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('numTpl', { static: true }) private numTpl!: TemplateRef<unknown>;
  @ViewChild('otrosTpl', { static: true }) private otrosTpl!: TemplateRef<unknown>;
  @ViewChild('totalTpl', { static: true }) private totalTpl!: TemplateRef<unknown>;
  @ViewChild('fechaTpl', { static: true }) private fechaTpl!: TemplateRef<unknown>;
  @ViewChild('fiscalTpl', { static: true }) private fiscalTpl!: TemplateRef<unknown>;
  @ViewChild('estadoTpl', { static: true }) private estadoTpl!: TemplateRef<unknown>;

  readonly esDemo = this.dataSource.esDemo;
  readonly pageSize = PAGE_SIZE;
  readonly condicionFiscal = CONDICION_FISCAL_MAP;
  readonly estadoRegistro = ESTADO_REGISTRO_MAP;

  // --- Filtros
  readonly filtrosAbiertos = signal(true);
  readonly filtros = new FormGroup({
    fechaInicio: new FormControl(FILTROS_INICIALES.fechaInicio, { nonNullable: true }),
    fechaFin: new FormControl(FILTROS_INICIALES.fechaFin, { nonNullable: true }),
    semana: new FormControl(FILTROS_INICIALES.semana, { nonNullable: true }),
    areaId: new FormControl(FILTROS_INICIALES.areaId, { nonNullable: true }),
    actividad: new FormControl(FILTROS_INICIALES.actividad, { nonNullable: true }),
    regionId: new FormControl(FILTROS_INICIALES.regionId, { nonNullable: true }),
    municipio: new FormControl(FILTROS_INICIALES.municipio, { nonNullable: true }),
    estimuloFiscal: new FormControl<EstimuloFiscalFiltro>(FILTROS_INICIALES.estimuloFiscal, { nonNullable: true }),
  });
  private readonly filtrosAplicados = signal<FiltrosReporteDto>(this.leerFiltros());

  readonly catalogos = signal<CatalogosReporteDto | null>(null);
  readonly opcionesSemana: SelectOption[] = [
    { value: TODOS, label: 'Semana 1 - 52' },
    ...Array.from({ length: 52 }, (_, i) => ({ value: String(i + 1), label: `Semana ${i + 1}` })),
  ];
  readonly opcionesEstimulo: SelectOption[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'con', label: 'Con estímulo fiscal' },
    { value: 'sin', label: 'Sin estímulo fiscal' },
  ];
  readonly opcionesArea = computed<SelectOption[]>(() => [
    { value: TODOS, label: 'Todas las áreas' },
    ...(this.catalogos()?.areas ?? []).map(a => ({ value: a.id, label: a.nombre })),
  ]);
  readonly opcionesRegion = computed<SelectOption[]>(() => [
    { value: TODOS, label: 'Todas las regiones' },
    ...(this.catalogos()?.regiones ?? []).map(r => ({ value: r.id, label: r.nombre })),
  ]);

  // --- Estadísticas
  readonly estadisticas = signal<EstadisticasReporteDto | null>(null);
  readonly cargandoEstadisticas = signal(false);
  readonly errorEstadisticas = signal<string | null>(null);

  readonly genero = computed(() => {
    const r = this.estadisticas()?.resumen;
    const total = r ? r.hombres + r.mujeres + r.otros : 0;
    return {
      total,
      h: pct(r?.hombres ?? 0, total),
      m: pct(r?.mujeres ?? 0, total),
      o: pct(r?.otros ?? 0, total),
    };
  });
  readonly totalGeneroCompacto = computed(() => compacto(this.genero().total));

  readonly kpis = computed<Kpi[]>(() => {
    const r = this.estadisticas()?.resumen;
    if (!r) return [];
    const g = this.genero();
    const fmt = (n: number) => n.toLocaleString('en-US');
    const signo = r.variacionAccionesPct >= 0 ? '+' : '';
    return [
      {
        titulo: 'Total Acciones', valor: fmt(r.totalAcciones), pie: 'vs mes anterior',
        badge: { texto: `${signo}${r.variacionAccionesPct}%`, variant: r.variacionAccionesPct >= 0 ? 'success' : 'danger' },
      },
      { titulo: 'Beneficiarios Totales', valor: fmt(r.beneficiarios), pie: 'Personas atendidas' },
      { titulo: 'Hombres (H)', valor: fmt(r.hombres), pie: '', badge: { texto: `${g.h}%`, variant: 'primary' } },
      { titulo: 'Mujeres (M)', valor: fmt(r.mujeres), pie: '', badge: { texto: `${g.m}%`, variant: 'danger' } },
      { titulo: 'Otro / No Binario (O)', valor: fmt(r.otros), pie: '', badge: { texto: `${g.o}%`, variant: 'ghost' } },
      {
        titulo: 'Coherencia Geográfica', valor: `${r.municipiosCubiertos} / ${r.municipiosTotales}`, pie: 'Municipios cubiertos',
        badge: { texto: `${pct(r.municipiosCubiertos, r.municipiosTotales)}%`, variant: 'success' },
      },
    ];
  });

  readonly maxComparativo = computed(() => Math.max(1, ...(this.estadisticas()?.comparativo ?? []).map(p => p.valor)));
  readonly maxRegiones = computed(() => Math.max(1, ...(this.estadisticas()?.topRegiones ?? []).map(p => p.valor)));
  readonly maxTendencia = computed(() => Math.max(1, ...(this.estadisticas()?.tendencia ?? []).map(p => p.valor)));

  // --- Registros
  readonly busqueda = new FormControl('', { nonNullable: true });
  readonly registros = signal<RegistroReporteDto[]>([]);
  readonly meta = signal<PaginationMeta>(EMPTY_META);
  readonly cargandoRegistros = signal(false);
  readonly errorRegistros = signal<string | null>(null);
  readonly rangoInicio = computed(() => (this.meta().total === 0 ? 0 : (this.meta().page - 1) * PAGE_SIZE + 1));
  readonly rangoFin = computed(() => Math.min(this.meta().page * PAGE_SIZE, this.meta().total));

  readonly exportando = signal(false);
  columnas: TableColumn[] = [];

  ngOnInit(): void {
    this.columnas = [
      { key: 'folio', label: 'Folio / ID' },
      { key: 'areaOperativa', label: 'Área Operativa' },
      { key: 'tramite', label: 'Trámite / Actividad' },
      { key: 'region', label: 'Región' },
      { key: 'municipio', label: 'Municipio' },
      { key: 'acciones', label: 'Acciones', align: 'right', template: this.numTpl },
      { key: 'hombres', label: 'H', align: 'right', template: this.numTpl },
      { key: 'mujeres', label: 'M', align: 'right', template: this.numTpl },
      { key: 'otros', label: 'O', align: 'right', template: this.otrosTpl },
      { key: 'total', label: 'Total', align: 'right', template: this.totalTpl },
      { key: 'fechaRegistro', label: 'Fecha Registro', template: this.fechaTpl },
      { key: 'condicionFiscal', label: 'Condición Fiscal', template: this.fiscalTpl },
      { key: 'estado', label: 'Estado', template: this.estadoTpl },
    ];

    this.busqueda.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarRegistros(1));

    this.dataSource.getCatalogos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => this.catalogos.set(c),
        error: () => this.notifications.error('Catálogos no disponibles', 'No se pudieron cargar áreas y regiones.'),
      });

    this.cargarEstadisticas();
    this.cargarRegistros(1);
  }

  aplicarFiltros(): void {
    const f = this.leerFiltros();
    if (f.fechaInicio && f.fechaFin && f.fechaInicio > f.fechaFin) {
      this.notifications.error('Rango de fechas inválido', 'La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.filtrosAplicados.set(f);
    this.cargarEstadisticas();
    this.cargarRegistros(1);
  }

  limpiarFiltros(): void {
    this.filtros.reset(FILTROS_INICIALES);
    this.busqueda.setValue('', { emitEvent: false });
    this.aplicarFiltros();
  }

  cargarEstadisticas(): void {
    this.cargandoEstadisticas.set(true);
    this.errorEstadisticas.set(null);
    this.dataSource.getEstadisticas(this.filtrosAplicados())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: e => {
          this.estadisticas.set(e);
          this.cargandoEstadisticas.set(false);
        },
        error: (e: { message?: string }) => {
          this.cargandoEstadisticas.set(false);
          this.errorEstadisticas.set(e?.message ?? 'No se pudieron cargar las estadísticas.');
        },
      });
  }

  cargarRegistros(page: number): void {
    this.cargandoRegistros.set(true);
    this.errorRegistros.set(null);
    this.dataSource.getRegistros(this.filtrosAplicados(), { page, limit: PAGE_SIZE, busqueda: this.busqueda.value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.registros.set(res.data);
          this.meta.set(res.meta);
          this.cargandoRegistros.set(false);
        },
        error: (e: { message?: string }) => {
          this.cargandoRegistros.set(false);
          this.errorRegistros.set(e?.message ?? 'No se pudieron cargar los registros.');
        },
      });
  }

  onPageChange(e: PageChangeEvent): void {
    if (e.page !== this.meta().page) this.cargarRegistros(e.page);
  }

  exportarExcel(): void {
    this.exportando.set(true);
    this.dataSource.exportarRegistros(this.filtrosAplicados())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async filas => {
          try {
            const data = filas.map(r => ({
              ...r,
              fechaRegistro: r.fechaRegistro.slice(0, 10),
              condicionFiscal: CONDICION_FISCAL_MAP[r.condicionFiscal].label,
              estado: ESTADO_REGISTRO_MAP[r.estado].label,
            }));
            const columnas = this.columnas.map(c => ({ key: c.key, header: c.label }));
            const fecha = new Date().toISOString().slice(0, 10);
            await this.exportService.toXlsx(data, columnas, `reporte-consolidado-${fecha}`);
            this.notifications.success('Exportación lista', `Se exportaron ${filas.length.toLocaleString('en-US')} registros.`);
          } catch {
            this.notifications.error('No se pudo exportar', 'Ocurrió un problema al generar el archivo Excel.');
          } finally {
            this.exportando.set(false);
          }
        },
        error: (e: { message?: string }) => {
          this.exportando.set(false);
          this.notifications.error('No se pudo exportar', e?.message ?? 'Intenta de nuevo.');
        },
      });
  }

  altura(valor: number, max: number): number {
    return Math.max(2, (valor / max) * 100);
  }

  tonoRegion(i: number): string {
    return ['bg-blue-700', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300'][i] ?? 'bg-blue-200';
  }

  descripcionSerie(serie?: { etiqueta: string; valor: number }[]): string {
    return (serie ?? []).map(p => `${p.etiqueta}: ${p.valor}`).join(', ');
  }

  private leerFiltros(): FiltrosReporteDto {
    const v = this.filtros.getRawValue();
    return {
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin,
      semana: v.semana ? Number(v.semana) : null,
      areaId: v.areaId || null,
      actividad: v.actividad.trim() || null,
      regionId: v.regionId || null,
      municipio: v.municipio.trim() || null,
      estimuloFiscal: v.estimuloFiscal,
    };
  }
}
