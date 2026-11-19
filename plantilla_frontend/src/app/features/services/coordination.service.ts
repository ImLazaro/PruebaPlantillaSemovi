import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable, Provider, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { delay, Observable, of, tap, throwError } from 'rxjs';
import { BaseApiService, QueryParams } from '@/app/core/services/base-api.service';
import { PaginatedResponse, PaginationMeta } from '@/app/core/models/dto';
import {
  CumplimientoPage,
  CumplimientoQuery,
  CumplimientoSemanalDto,
  ResumenAreasDto,
} from '../models/coordination.model';
import {
  AlertaModificacionDto,
  AlertasPage,
  AlertasQuery,
  ValidarAlertaDto,
} from '../models/alert-validation.model';
import { EstatusCumplimiento } from '../models/week-status.model';

// =====================================================================
// Contrato de acceso a datos (token de DI)
// =====================================================================

/** La ruta decide si se provee la implementación HTTP real o la de datos ilustrativos. */
export abstract class InicioCoordinacionDataSource {
  abstract getResumen(): Observable<ResumenAreasDto>;
  abstract getCumplimiento(query: CumplimientoQuery): Observable<CumplimientoPage>;
  abstract getAlertas(query: AlertasQuery): Observable<AlertasPage>;
  abstract validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto>;
}

/** `useMock: true` usa datos ilustrativos; `false` consume `environment.apiUrl`. */
export function provideInicioCoordinacion(options: { useMock: boolean }): Provider[] {
  return [
    {
      provide: InicioCoordinacionDataSource,
      useClass: options.useMock ? InicioCoordinacionMockService : InicioCoordinacionApiService,
    },
    InicioCoordinacionStore,
  ];
}

// =====================================================================
// Implementación HTTP (endpoints documentados en models/coordination.model.ts)
// =====================================================================

@Injectable()
export class InicioCoordinacionApiService
  extends BaseApiService<CumplimientoSemanalDto>
  implements InicioCoordinacionDataSource {

  protected readonly endpoint = '/coordinacion/inicio';

  constructor() {
    super(inject(HttpClient));
  }

  getResumen(): Observable<ResumenAreasDto> {
    return this.get<ResumenAreasDto>('/resumen');
  }

  getCumplimiento(query: CumplimientoQuery): Observable<CumplimientoPage> {
    return this.get<CumplimientoPage>('/cumplimiento', toParams(query));
  }

  getAlertas(query: AlertasQuery): Observable<AlertasPage> {
    return this.get<AlertasPage>('/alertas', toParams(query));
  }

  validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto> {
    return this.patch<AlertaModificacionDto>(`/alertas/${encodeURIComponent(id)}/validar`, body);
  }
}

function toParams(query: CumplimientoQuery | AlertasQuery): QueryParams {
  return { page: query.page, limit: query.limit, sort: query.sort, order: query.order, estatus: query.estatus };
}

// =====================================================================
// Implementación con datos ilustrativos (mismo contrato y paginación)
// =====================================================================

const LATENCIA_MS = 350;

const AREAS: Array<[string, string, number, string, EstatusCumplimiento]> = [
  ['Dirección de Concesiones', 'M. Rojas', 41, '2026-10-06T08:15:00', 'al_corriente'],
  ['Unidad de Seguimiento', 'A. Soto', 40, '2026-10-05T17:40:00', 'rezago_1_semana'],
  ['Área de Informática', 'J. Mora', 40, '2026-10-04T09:10:00', 'rezago_1_semana'],
  ['Centro de Atención Ciudadana', 'L. Araya', 38, '2026-10-03T11:25:00', 'rezago_2_mas_semanas'],
  ['Departamento Jurídico', 'P. Vargas', 37, '2026-10-02T14:50:00', 'rezago_2_mas_semanas'],
  ['Oficina de Planificación', 'C. Gómez', 41, '2026-10-06T07:55:00', 'al_corriente'],
  ['Dirección de Transporte Público', 'R. Díaz', 41, '2026-10-06T09:30:00', 'al_corriente'],
  ['Subdirección de Licencias', 'E. Pérez', 41, '2026-10-06T10:05:00', 'al_corriente'],
  ['Unidad de Transparencia', 'S. Luna', 41, '2026-10-05T16:20:00', 'al_corriente'],
  ['Dirección de Movilidad Activa', 'F. Ortiz', 41, '2026-10-06T08:40:00', 'al_corriente'],
  ['Coordinación de Comunicación', 'V. Ramos', 39, '2026-09-29T12:10:00', 'rezago_1_semana'],
  ['Dirección de Seguridad Vial', 'H. Cruz', 41, '2026-10-06T11:00:00', 'al_corriente'],
  ['Subdirección de Control Vehicular', 'G. Núñez', 41, '2026-10-05T18:15:00', 'al_corriente'],
  ['Unidad de Proyectos Especiales', 'D. Ríos', 41, '2026-10-06T09:45:00', 'al_corriente'],
  ['Dirección de Administración', 'K. León', 41, '2026-10-06T07:30:00', 'al_corriente'],
  ['Subdirección de Recursos Humanos', 'N. Salas', 41, '2026-10-05T15:55:00', 'al_corriente'],
  ['Subdirección de Recursos Financieros', 'O. Vega', 41, '2026-10-06T10:25:00', 'al_corriente'],
  ['Órgano Interno de Control', 'T. Campos', 36, '2026-09-22T13:35:00', 'rezago_2_mas_semanas'],
  ['Dirección de Infraestructura', 'B. Flores', 41, '2026-10-06T12:05:00', 'al_corriente'],
  ['Unidad de Estadística', 'I. Mejía', 41, '2026-10-05T17:05:00', 'al_corriente'],
  ['Dirección de Evaluación', 'W. Castro', 41, '2026-10-06T08:55:00', 'al_corriente'],
  ['Subdirección de Normatividad', 'Y. Reyes', 41, '2026-10-06T09:15:00', 'al_corriente'],
  ['Unidad de Igualdad Sustantiva', 'Z. Torres', 41, '2026-10-05T14:30:00', 'al_corriente'],
  ['Dirección de Atención a Quejas', 'U. Medina', 41, '2026-10-06T10:50:00', 'al_corriente'],
];

@Injectable()
export class InicioCoordinacionMockService implements InicioCoordinacionDataSource {
  private readonly cumplimiento: CumplimientoSemanalDto[] = AREAS.map(
    ([area, responsable, semanaReportada, ultimaActualizacion, estatus], i) => ({
      id: `cum-${i + 1}`, areaId: `area-${i + 1}`, area, responsable, semanaReportada, ultimaActualizacion, estatus,
    }),
  );

  private alertas: AlertaModificacionDto[] = [
    alertaMock(1, 'Dirección de Concesiones', '2026-10-02T14:20:00', 39, 'SEMOVI/SUB/045/2026', 'pendiente'),
    alertaMock(2, 'Unidad de Seguimiento', '2026-10-01T09:05:00', 38, 'SEMOVI/US/012/2026', 'recibido'),
    alertaMock(3, 'Área de Informática', '2026-09-30T17:45:00', 37, null, 'pendiente'),
    alertaMock(4, 'Centro de Atención Ciudadana', '2026-09-29T10:30:00', 36, null, 'recibido'),
    alertaMock(5, 'Departamento Jurídico', '2026-09-28T08:10:00', 35, null, 'pendiente'),
    alertaMock(6, 'Oficina de Planificación', '2026-09-27T16:40:00', 34, null, 'recibido'),
  ];

  getResumen(): Observable<ResumenAreasDto> {
    const areasAlDia = this.cumplimiento.filter(c => c.estatus === 'al_corriente').length;
    return of({
      totalAreas: this.cumplimiento.length,
      areasAlDia,
      areasConRezago: this.cumplimiento.length - areasAlDia,
    }).pipe(delay(LATENCIA_MS));
  }

  getCumplimiento(query: CumplimientoQuery): Observable<CumplimientoPage> {
    const items = query.estatus ? this.cumplimiento.filter(c => c.estatus === query.estatus) : this.cumplimiento;
    return of(paginate(items, query.page, query.limit)).pipe(delay(LATENCIA_MS));
  }

  getAlertas(query: AlertasQuery): Observable<AlertasPage> {
    const items = query.estatus ? this.alertas.filter(a => a.estatus === query.estatus) : this.alertas;
    return of(paginate(items, query.page, query.limit)).pipe(delay(LATENCIA_MS));
  }

  validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto> {
    const actual = this.alertas.find(a => a.id === id);
    if (!actual) {
      return throwError(() => ({ message: 'Alerta no encontrada', status: 404 }));
    }
    const actualizada: AlertaModificacionDto = { ...actual, estatus: 'recibido', folio: body.folio?.trim() || actual.folio };
    this.alertas = this.alertas.map(a => (a.id === id ? actualizada : a));
    return of(actualizada).pipe(delay(LATENCIA_MS));
  }
}

function alertaMock(
  n: number, area: string, fechaHora: string, semanaAfectada: number,
  folio: string | null, estatus: AlertaModificacionDto['estatus'],
): AlertaModificacionDto {
  return {
    id: `alt-${n}`, areaId: `area-${n}`, area, fechaHora, semanaAfectada, folio, estatus,
    descripcion: `Se modificó el reporte de la semana ${semanaAfectada} después de su cierre.`,
  };
}

function paginate<T>(items: T[], page = 1, limit = 10): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: { page: current, limit, total, totalPages, hasNext: current < totalPages, hasPrev: current > 1 },
  };
}

// =====================================================================
// Estado de la pantalla (señales). Se provee a nivel de ruta.
// =====================================================================

export interface SeccionState<T> {
  loading: boolean;
  error: string | null;
  data: T;
}

export const CUMPLIMIENTO_PAGE_SIZE = 6;
export const ALERTAS_PAGE_SIZE = 10;

const EMPTY_META: PaginationMeta = { page: 1, limit: 0, total: 0, totalPages: 1, hasNext: false, hasPrev: false };

interface ApiError { message?: string }

@Injectable()
export class InicioCoordinacionStore {
  private readonly dataSource = inject(InicioCoordinacionDataSource);
  private readonly destroyRef = inject(DestroyRef);

  readonly resumen = signal<SeccionState<ResumenAreasDto | null>>({ loading: false, error: null, data: null });
  readonly cumplimiento = signal<SeccionState<CumplimientoSemanalDto[]>>({ loading: false, error: null, data: [] });
  readonly cumplimientoMeta = signal<PaginationMeta>(EMPTY_META);
  readonly alertas = signal<SeccionState<AlertaModificacionDto[]>>({ loading: false, error: null, data: [] });
  readonly alertasMeta = signal<PaginationMeta>(EMPTY_META);
  readonly alertasActualizadas = signal<Date | null>(null);

  cargarTodo(): void {
    this.cargarResumen();
    this.cargarCumplimiento(1);
    this.cargarAlertas(1);
  }

  cargarResumen(): void {
    this.resumen.update(s => ({ ...s, loading: true, error: null }));
    this.dataSource.getResumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.resumen.set({ loading: false, error: null, data }),
        error: (e: ApiError) => this.resumen.update(s => ({ ...s, loading: false, error: mensaje(e) })),
      });
  }

  cargarCumplimiento(page: number): void {
    this.cumplimiento.update(s => ({ ...s, loading: true, error: null }));
    this.dataSource.getCumplimiento({ page, limit: CUMPLIMIENTO_PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.cumplimiento.set({ loading: false, error: null, data: res.data });
          this.cumplimientoMeta.set(res.meta);
        },
        error: (e: ApiError) => this.cumplimiento.update(s => ({ ...s, loading: false, error: mensaje(e) })),
      });
  }

  cargarAlertas(page: number): void {
    this.alertas.update(s => ({ ...s, loading: true, error: null }));
    this.dataSource.getAlertas({ page, limit: ALERTAS_PAGE_SIZE, sort: 'fechaHora', order: 'DESC' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.alertas.set({ loading: false, error: null, data: res.data });
          this.alertasMeta.set(res.meta);
          this.alertasActualizadas.set(new Date());
        },
        error: (e: ApiError) => this.alertas.update(s => ({ ...s, loading: false, error: mensaje(e) })),
      });
  }

  /** Valida una alerta y actualiza la fila localmente con la respuesta del backend. */
  validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto> {
    return this.dataSource.validarAlerta(id, body).pipe(
      tap(actualizada => this.alertas.update(s => ({
        ...s,
        data: s.data.map(a => (a.id === actualizada.id ? actualizada : a)),
      }))),
    );
  }
}

function mensaje(e: ApiError): string {
  return e?.message || 'No se pudo obtener la información.';
}
