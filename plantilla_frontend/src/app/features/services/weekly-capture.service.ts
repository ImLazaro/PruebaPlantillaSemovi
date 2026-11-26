import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { WeekCaptureStatus, WeeklyCaptureSummary, WeekStatusItem } from '../models/week-status.model';

// MOCK: semana activa alineada con CaptureFormService (semana 40 de 2026)
const MOCK_YEAR = 2026;
const MOCK_CURRENT_WEEK = 40;
/** Semanas vencidas sin captura (se corrigen con Actualización Extemporánea). */
const MOCK_OVERDUE = new Set([37, 39]);

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Semanas de domingo a sábado, empezando el primer domingo del año. */
function buildWeeks(year: number, currentWeek: number): WeekStatusItem[] {
  const first = new Date(Date.UTC(year, 0, 1));
  first.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 52 }, (_, i) => {
    const week = i + 1;
    const start = new Date(first);
    start.setUTCDate(first.getUTCDate() + i * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    let status: WeekCaptureStatus = 'captured';
    if (week === currentWeek) status = 'current';
    else if (week > currentWeek) status = 'future';
    else if (MOCK_OVERDUE.has(week)) status = 'overdue';
    return { week, year, start: toIso(start), end: toIso(end), status };
  });
}

@Injectable({ providedIn: 'root' })
export class WeeklyCaptureService {
  // MOCK: reemplazar por llamada real (extendiendo BaseApiService de core/services)
  getSummary(year = MOCK_YEAR): Observable<WeeklyCaptureSummary> {
    return of<WeeklyCaptureSummary>({
      year,
      area: 'Departamento de Concesiones',
      currentWeek: MOCK_CURRENT_WEEK,
      weeks: buildWeeks(year, MOCK_CURRENT_WEEK),
    }).pipe(delay(300));
  }
}
