import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Provider } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { PaginatedResponse } from '@/app/core/models/dto';
import { BaseApiService, QueryParams } from '@/app/core/services/base-api.service';
import {
  CatalogosReporteDto,
  CondicionFiscal,
  EstadisticasReporteDto,
  EstadoRegistro,
  FiltrosReporteDto,
  RegistroReporteDto,
  RegistrosPage,
  RegistrosQuery,
} from '../models/reportes-estadisticas-consolidadas.model';

// =====================================================================
// Contrato de acceso a datos (token de DI)
// =====================================================================

export abstract class ReportesDataSource {
  /** `true` cuando los datos son ilustrativos (mock). */
  abstract readonly esDemo: boolean;
  abstract getCatalogos(): Observable<CatalogosReporteDto>;
  abstract getEstadisticas(filtros: FiltrosReporteDto): Observable<EstadisticasReporteDto>;
  abstract getRegistros(filtros: FiltrosReporteDto, query: RegistrosQuery): Observable<RegistrosPage>;
  abstract exportarRegistros(filtros: FiltrosReporteDto): Observable<RegistroReporteDto[]>;
}

/** `useMock: true` usa datos ilustrativos; `false` consume `environment.apiUrl`. */
export function provideReportesEstadisticas(options: { useMock: boolean }): Provider[] {
  return [
    {
      provide: ReportesDataSource,
      useClass: options.useMock ? ReportesMockService : ReportesApiService,
    },
  ];
}

function filtrosToParams(f: FiltrosReporteDto): QueryParams {
  return {
    fechaInicio: f.fechaInicio,
    fechaFin: f.fechaFin,
    semana: f.semana ?? undefined,
    areaId: f.areaId ?? undefined,
    actividad: f.actividad || undefined,
    regionId: f.regionId ?? undefined,
    municipio: f.municipio || undefined,
    estimuloFiscal: f.estimuloFiscal === 'todos' ? undefined : f.estimuloFiscal,
  };
}

// =====================================================================
// Implementación HTTP (endpoints documentados en el modelo)
// =====================================================================

@Injectable()
export class ReportesApiService extends BaseApiService<RegistroReporteDto> implements ReportesDataSource {
  readonly esDemo = false;
  protected readonly endpoint = '/reportes';

  constructor() {
    super(inject(HttpClient));
  }

  getCatalogos(): Observable<CatalogosReporteDto> {
    return this.get<CatalogosReporteDto>('/catalogos');
  }

  getEstadisticas(filtros: FiltrosReporteDto): Observable<EstadisticasReporteDto> {
    return this.get<EstadisticasReporteDto>('/estadisticas', filtrosToParams(filtros));
  }

  getRegistros(filtros: FiltrosReporteDto, query: RegistrosQuery): Observable<RegistrosPage> {
    return this.get<RegistrosPage>('/registros', {
      ...filtrosToParams(filtros),
      page: query.page,
      limit: query.limit,
      busqueda: query.busqueda || undefined,
    });
  }

  exportarRegistros(filtros: FiltrosReporteDto): Observable<RegistroReporteDto[]> {
    return this.get<RegistroReporteDto[]>('/registros/exportar', filtrosToParams(filtros));
  }
}

// =====================================================================
// Implementación con datos ilustrativos
// =====================================================================

const LATENCIA_MS = 400;

const AREAS = [
  { id: 'semovi', nombre: 'SEMOVI' },
  { id: 'sedesol', nombre: 'Sedesol' },
];

const REGIONES = [
  { id: 'valles', nombre: 'Valles Centrales', municipios: ['Oaxaca de Juárez', 'Santa Cruz Xoxocotlán', 'Tlacolula'] },
  { id: 'istmo', nombre: 'Istmo', municipios: ['Juchitán', 'Salina Cruz', 'Tehuantepec'] },
  { id: 'papaloapan', nombre: 'Papaloapan', municipios: ['Tuxtepec', 'Loma Bonita'] },
  { id: 'costa', nombre: 'Costa', municipios: ['Puerto Escondido', 'Pinotepa Nacional', 'Pochutla'] },
];

const TRAMITES: Record<string, string[]> = {
  semovi: ['Licencia de Conducir', 'Permisos Especiales', 'Placas Vehiculares'],
  sedesol: ['Apoyo Alimentario', 'Programa de Vivienda', 'Becas Escolares'],
};

const TOTAL_REGISTROS_DEMO = 1240;

@Injectable()
export class ReportesMockService implements ReportesDataSource {
  readonly esDemo = true;
  private readonly registros = generarRegistros(TOTAL_REGISTROS_DEMO);

  getCatalogos(): Observable<CatalogosReporteDto> {
    return of<CatalogosReporteDto>({
      areas: AREAS,
      regiones: REGIONES.map(({ id, nombre }) => ({ id, nombre })),
      totalMunicipios: 570,
    }).pipe(delay(LATENCIA_MS));
  }

  getEstadisticas(): Observable<EstadisticasReporteDto> {
    return of<EstadisticasReporteDto>({
      resumen: {
        totalAcciones: 45210,
        variacionAccionesPct: 12,
        beneficiarios: 128450,
        hombres: 61200,
        mujeres: 67250,
        otros: 0,
        municipiosCubiertos: 570,
        municipiosTotales: 570,
      },
      comparativo: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'].map((etiqueta, i) => ({
        etiqueta,
        valor: [4200, 3800, 4600, 3200, 5100, 4300, 5500, 4700, 5900][i],
      })),
      topRegiones: [
        { etiqueta: 'Valles Centrales', valor: 12450 },
        { etiqueta: 'Istmo', valor: 9200 },
        { etiqueta: 'Papaloapan', valor: 8100 },
        { etiqueta: 'Costa', valor: 7500 },
      ],
      tendencia: Array.from({ length: 12 }, (_, i) => ({
        etiqueta: `S${(i + 1) * 4}`,
        valor: 900 + i * 260 + (i % 3) * 90,
      })),
    }).pipe(delay(LATENCIA_MS));
  }

  getRegistros(filtros: FiltrosReporteDto, query: RegistrosQuery): Observable<RegistrosPage> {
    return of(paginar(this.filtrar(filtros, query.busqueda), query.page, query.limit)).pipe(delay(LATENCIA_MS));
  }

  exportarRegistros(filtros: FiltrosReporteDto): Observable<RegistroReporteDto[]> {
    return of(this.filtrar(filtros)).pipe(delay(LATENCIA_MS));
  }

  private filtrar(f: FiltrosReporteDto, busqueda?: string | null): RegistroReporteDto[] {
    const area = AREAS.find(a => a.id === f.areaId)?.nombre;
    const region = REGIONES.find(r => r.id === f.regionId)?.nombre;
    const texto = busqueda?.trim().toLowerCase();
    const condicion: CondicionFiscal | null =
      f.estimuloFiscal === 'con' ? 'con_estimulo' : f.estimuloFiscal === 'sin' ? 'sin_estimulo' : null;
    return this.registros.filter(r =>
      (!area || r.areaOperativa === area) &&
      (!region || r.region === region) &&
      (!condicion || r.condicionFiscal === condicion) &&
      (!f.actividad || r.tramite.toLowerCase().includes(f.actividad.toLowerCase())) &&
      (!f.municipio || r.municipio.toLowerCase().includes(f.municipio.toLowerCase())) &&
      (!texto || r.folio.toLowerCase().includes(texto) || r.municipio.toLowerCase().includes(texto)),
    );
  }
}

/** Registros deterministas (mismo resultado en cada carga). */
function generarRegistros(total: number): RegistroReporteDto[] {
  const condiciones: CondicionFiscal[] = ['no_especificado', 'con_estimulo', 'no_especificado', 'sin_estimulo'];
  const estados: EstadoRegistro[] = ['completado', 'en_revision', 'completado', 'completado'];
  const fin = new Date('2026-10-31T12:00:00');
  return Array.from({ length: total }, (_, i) => {
    const area = AREAS[i % 2];
    const region = REGIONES[i % REGIONES.length];
    const tramites = TRAMITES[area.id];
    const hombres = 300 + ((i * 37) % 300);
    const mujeres = 320 + ((i * 53) % 360);
    const fecha = new Date(fin);
    fecha.setDate(fin.getDate() - Math.floor(i / 4));
    return {
      id: `reg-${i + 1}`,
      folio: `REP-2026-${String(i + 1).padStart(4, '0')}`,
      areaOperativa: area.nombre,
      tramite: tramites[i % tramites.length],
      region: region.nombre,
      municipio: region.municipios[i % region.municipios.length],
      acciones: hombres + mujeres,
      hombres,
      mujeres,
      otros: 0,
      total: hombres + mujeres,
      fechaRegistro: fecha.toISOString(),
      condicionFiscal: condiciones[i % condiciones.length],
      estado: estados[i % estados.length],
    };
  });
}

function paginar<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const actual = Math.min(Math.max(1, page), totalPages);
  const inicio = (actual - 1) * limit;
  return {
    data: items.slice(inicio, inicio + limit),
    meta: { page: actual, limit, total, totalPages, hasNext: actual < totalPages, hasPrev: actual > 1 },
  };
}
