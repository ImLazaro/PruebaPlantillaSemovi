import { StatusPillMap } from '@/app/shared/components/entity-status-pill/entity-status-pill.component';
import { EstatusAlerta, EstatusCumplimiento } from './inicio-coordinacion.models';

/** Mapeo de estatus de cumplimiento → pill institucional. */
export const ESTATUS_CUMPLIMIENTO_MAP: Record<EstatusCumplimiento, StatusPillMap> = {
  al_corriente: { label: 'Al corriente', variant: 'success' },
  rezago_1_semana: { label: 'Rezago de 1 semana', variant: 'warning' },
  rezago_2_mas_semanas: { label: 'Rezago de 2+ semanas', variant: 'danger' },
};

/** Mapeo de estatus de alerta → pill institucional. */
export const ESTATUS_ALERTA_MAP: Record<EstatusAlerta, StatusPillMap> = {
  pendiente: { label: 'Pendiente', variant: 'ghost' },
  recibido: { label: 'Recibido', variant: 'success' },
};

/** Formato de fecha usado en las tablas: 06/10/2026 · 08:15 */
export const FORMATO_FECHA_HORA = "dd/MM/yyyy '·' HH:mm";
