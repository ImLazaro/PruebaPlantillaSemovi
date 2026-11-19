/**
 * Contratos de la pantalla Inicio Coordinación (SISER 2.0).
 *
 * Endpoints esperados (base `{apiUrl}/coordinacion/inicio`):
 * - GET   /resumen                → ResumenAreasDto
 * - GET   /cumplimiento           → PaginatedResponse<CumplimientoSemanalDto>  (page, limit, sort?, order?, estatus?)
 * - GET   /alertas                → PaginatedResponse<AlertaModificacionDto>   (alert-validation.model.ts)
 * - PATCH /alertas/:id/validar    body ValidarAlertaDto → AlertaModificacionDto (estatus 'recibido')
 *
 * Si el contrato cambia, actualizar estos archivos en el mismo commit.
 */
import { PaginatedResponse, PaginationParams } from '@/app/core/models/dto';
import { EstatusCumplimiento } from './week-status.model';

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

export interface CumplimientoQuery extends PaginationParams {
  estatus?: EstatusCumplimiento;
}

export type CumplimientoPage = PaginatedResponse<CumplimientoSemanalDto>;
