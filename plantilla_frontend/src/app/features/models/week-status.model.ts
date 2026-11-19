/** Estatus de cumplimiento del reporte semanal de un área. */
export type EstatusCumplimiento = 'al_corriente' | 'rezago_1_semana' | 'rezago_2_mas_semanas';

/** Etiqueta y variante visual de un estatus (compatible con `StatusPillMap`). */
export interface EstatusVisual {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'ghost';
}

export const ESTATUS_CUMPLIMIENTO_MAP: Record<EstatusCumplimiento, EstatusVisual> = {
  al_corriente: { label: 'Al corriente', variant: 'success' },
  rezago_1_semana: { label: 'Rezago de 1 semana', variant: 'warning' },
  rezago_2_mas_semanas: { label: 'Rezago de 2+ semanas', variant: 'danger' },
};
