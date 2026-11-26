export type ProcedureStatus = 'completed' | 'pending';

/** Trámite asignado al área para la semana activa. */
export interface CaptureProcedure {
  id: string;
  code: string;
  name: string;
  status: ProcedureStatus;
}

/** Formulario de captura de la semana activa. */
export interface ActiveWeekForm {
  week: number;
  /** Fecha ISO `yyyy-MM-dd` de inicio del periodo. */
  periodStart: string;
  /** Fecha ISO `yyyy-MM-dd` de fin del periodo. */
  periodEnd: string;
  area: string;
  procedures: CaptureProcedure[];
}
