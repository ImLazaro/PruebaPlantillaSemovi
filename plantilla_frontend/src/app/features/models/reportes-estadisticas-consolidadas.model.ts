/**
 * Contratos de la pantalla Reportes y Estadísticas Consolidadas (SISER 2.0).
 *
 * Endpoints esperados (base `{apiUrl}/reportes`). Todos reciben los filtros
 * de `FiltrosReporteDto` como query params (los vacíos se omiten):
 * - GET /catalogos             → CatalogosReporteDto
 * - GET /estadisticas          → EstadisticasReporteDto
 * - GET /registros             → PaginatedResponse<RegistroReporteDto>  (+ page, limit, busqueda)
 * - GET /registros/exportar    → RegistroReporteDto[]  (todos los registros filtrados, para Excel)
 */
import { PaginatedResponse } from '@/app/core/models/dto';

export type EstimuloFiscalFiltro = 'todos' | 'con' | 'sin';
export type CondicionFiscal = 'con_estimulo' | 'sin_estimulo' | 'no_especificado';
export type EstadoRegistro = 'completado' | 'en_revision' | 'rechazado';

export interface OpcionCatalogoDto {
  id: string;
  nombre: string;
}

/** GET /reportes/catalogos */
export interface CatalogosReporteDto {
  areas: OpcionCatalogoDto[];
  regiones: OpcionCatalogoDto[];
  /** Total de municipios del catálogo (p. ej. 570). */
  totalMunicipios: number;
}

export interface FiltrosReporteDto {
  /** Fecha ISO `yyyy-MM-dd`. */
  fechaInicio: string;
  /** Fecha ISO `yyyy-MM-dd`. */
  fechaFin: string;
  /** Semana específica (1-52); vacío = todas. */
  semana?: number | null;
  areaId?: string | null;
  actividad?: string | null;
  regionId?: string | null;
  municipio?: string | null;
  estimuloFiscal: EstimuloFiscalFiltro;
}

export interface ResumenReporteDto {
  totalAcciones: number;
  /** Variación porcentual contra el periodo anterior (p. ej. 12 = +12 %). */
  variacionAccionesPct: number;
  beneficiarios: number;
  hombres: number;
  mujeres: number;
  otros: number;
  municipiosCubiertos: number;
  municipiosTotales: number;
}

export interface PuntoSerieDto {
  etiqueta: string;
  valor: number;
}

/** GET /reportes/estadisticas */
export interface EstadisticasReporteDto {
  resumen: ResumenReporteDto;
  /** Actividades por semana o mes. */
  comparativo: PuntoSerieDto[];
  /** Regiones ordenadas de mayor a menor operatividad. */
  topRegiones: PuntoSerieDto[];
  /** Trámites atendidos en el tiempo. */
  tendencia: PuntoSerieDto[];
}

/** Elemento de GET /reportes/registros */
export interface RegistroReporteDto {
  id: string;
  folio: string;
  areaOperativa: string;
  tramite: string;
  region: string;
  municipio: string;
  acciones: number;
  hombres: number;
  mujeres: number;
  otros: number;
  total: number;
  /** Fecha ISO 8601. */
  fechaRegistro: string;
  condicionFiscal: CondicionFiscal;
  estado: EstadoRegistro;
}

export interface RegistrosQuery {
  page: number;
  limit: number;
  busqueda?: string | null;
}

export type RegistrosPage = PaginatedResponse<RegistroReporteDto>;

/** Etiqueta y variante visual (compatible con `StatusPillMap`). */
interface EtiquetaVisual {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'ghost';
}

export const CONDICION_FISCAL_MAP: Record<CondicionFiscal, EtiquetaVisual> = {
  con_estimulo: { label: 'Con Estímulo', variant: 'success' },
  sin_estimulo: { label: 'Sin Estímulo', variant: 'ghost' },
  no_especificado: { label: 'No especificado', variant: 'ghost' },
};

export const ESTADO_REGISTRO_MAP: Record<EstadoRegistro, EtiquetaVisual> = {
  completado: { label: 'Completado', variant: 'success' },
  en_revision: { label: 'En Revisión', variant: 'warning' },
  rechazado: { label: 'Rechazado', variant: 'danger' },
};
