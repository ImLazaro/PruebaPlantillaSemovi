import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, delay, filter, of } from 'rxjs';

import { ActiveWeekForm } from '../models/capture-form.model';

// MOCK: formulario de la semana activa, tomado del Figma
const MOCK_FORM: ActiveWeekForm = {
  week: 40,
  periodStart: '2026-09-27',
  periodEnd: '2026-10-03',
  area: 'Departamento de Concesiones',
  procedures: [
    { id: 'proc-1', code: 'CON-2026-041', name: 'Concesión de uso de vía pública', status: 'completed' },
    { id: 'proc-2', code: 'CON-2026-042', name: 'Permiso de obra menor', status: 'pending' },
    { id: 'proc-3', code: 'CON-2026-043', name: 'Renovación de concesión comercial', status: 'pending' },
    { id: 'proc-4', code: 'CON-2026-044', name: 'Autorización de evento temporal', status: 'pending' },
    { id: 'proc-5', code: 'CON-2026-045', name: 'Modificación de planos de obra', status: 'pending' },
  ],
};

@Injectable({ providedIn: 'root' })
export class CaptureFormService {
  private readonly form$ = new BehaviorSubject<ActiveWeekForm | null>(null);

  // MOCK: reemplazar por llamada real (extendiendo BaseApiService de core/services)
  getActiveWeekForm(): Observable<ActiveWeekForm> {
    if (!this.form$.value) {
      of(structuredClone(MOCK_FORM)).pipe(delay(300)).subscribe((form) => this.form$.next(form));
    }
    return this.form$.pipe(filter((form): form is ActiveWeekForm => form !== null));
  }

  /** Marca un trámite como completado (p. ej. tras guardar su captura manual). */
  markProcedureCompleted(procedureId: string): void {
    const form = this.form$.value;
    if (!form) return;
    this.form$.next({
      ...form,
      procedures: form.procedures.map((p) => (p.id === procedureId ? { ...p, status: 'completed' } : p)),
    });
  }
}
