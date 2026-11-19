import { PaginatedResponse, PaginationParams } from '@/app/core/models/dto';
import { EstatusVisual } from './week-status.model';

/** Estatus de una alerta de modificación extemporánea. */
export type EstatusAlerta = 'pendiente' | 'recibido';

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
  descripcion?: string | null;
}

/** Body de PATCH /coordinacion/inicio/alertas/:id/validar */
export interface ValidarAlertaDto {
  folio?: string | null;
  observaciones?: string | null;
}

export interface AlertasQuery extends PaginationParams {
  estatus?: EstatusAlerta;
}

export type AlertasPage = PaginatedResponse<AlertaModificacionDto>;

export const ESTATUS_ALERTA_MAP: Record<EstatusAlerta, EstatusVisual> = {
  pendiente: { label: 'Pendiente', variant: 'ghost' },
  recibido: { label: 'Recibido', variant: 'success' },
};
