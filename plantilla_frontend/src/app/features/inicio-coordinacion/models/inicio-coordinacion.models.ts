/**
 * Contratos de la feature "Inicio Coordinación" (SISER 2.0).
 *
 * Estos DTOs describen lo que se espera del backend. Si el contrato cambia,
 * actualizar este archivo y `README.md` de la feature en el mismo commit.
 */
import { PaginatedResponse, PaginationParams } from '@/app/core/models/dto';

/** Estatus de cumplimiento del reporte semanal de un área. */
export type EstatusCumplimiento = 'al_corriente' | 'rezago_1_semana' | 'rezago_2_mas_semanas';

/** Estatus de una alerta de modificación extemporánea. */
export type EstatusAlerta = 'pendiente' | 'recibido';

/** GET /coordinacion/inicio/resumen */
export interface ResumenAreasDto {
  totalAreas: number;
  areasAlDia: number;
  areasConRezago: number;
}

/** Elemento de GET /coordinacion/inicio/cumplimiento */
export interface CumplimientoSemanalDto {
  id: string;
  areaId: string;
  area: string;
  responsable: string;
  /** Número de semana ISO reportada. */
  semanaReportada: number;
  /** Fecha ISO 8601 de la última actualización del reporte. */
  ultimaActualizacion: string;
  estatus: EstatusCumplimiento;
}

/** Elemento de GET /coordinacion/inicio/alertas */
export interface AlertaModificacionDto {
  id: string;
  areaId: string;
  area: string;
  /** Fecha ISO 8601 en que se detectó la modificación. */
  fechaHora: string;
  semanaAfectada: number;
  /** Folio del memorándum u oficio; `null` si no se ha registrado. */
  folio: string | null;
  estatus: EstatusAlerta;
  /** Descripción opcional del cambio detectado. */
  descripcion?: string | null;
}

/** Body de PATCH /coordinacion/inicio/alertas/:id/validar */
export interface ValidarAlertaDto {
  folio?: string | null;
  observaciones?: string | null;
}

export interface CumplimientoQuery extends PaginationParams {
  estatus?: EstatusCumplimiento;
}

export interface AlertasQuery extends PaginationParams {
  estatus?: EstatusAlerta;
}

export type CumplimientoPage = PaginatedResponse<CumplimientoSemanalDto>;
export type AlertasPage = PaginatedResponse<AlertaModificacionDto>;
