import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { CapturedMunicipality, MunicipalityOption } from '../models/manual-capture.model';

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// MOCK: muestra del catálogo de municipios de Oaxaca (el real tiene 570)
const MOCK_MUNICIPALITIES: MunicipalityOption[] = [
  { id: 'mun-1', name: 'Oaxaca de Juárez', region: 'Valles Centrales' },
  { id: 'mun-2', name: 'Santa Cruz Xoxocotlán', region: 'Valles Centrales' },
  { id: 'mun-3', name: 'Santa Lucía del Camino', region: 'Valles Centrales' },
  { id: 'mun-4', name: 'Heroica Ciudad de Tlaxiaco', region: 'Mixteca' },
  { id: 'mun-5', name: 'Heroica Ciudad de Huajuapan de León', region: 'Mixteca' },
  { id: 'mun-6', name: 'San Pedro Mixtepec', region: 'Costa' },
  { id: 'mun-7', name: 'Juchitán de Zaragoza', region: 'Istmo' },
  { id: 'mun-8', name: 'Salina Cruz', region: 'Istmo' },
  { id: 'mun-9', name: 'Ixtlán de Juárez', region: 'Sierra de Juárez' },
  { id: 'mun-10', name: 'San Juan Bautista Tuxtepec', region: 'Papaloapan' },
];

// MOCK: capturas previas por trámite, tomadas del Figma
const MOCK_CAPTURES: Record<string, CapturedMunicipality[]> = {
  'proc-1': [
    {
      ...MOCK_MUNICIPALITIES[0],
      records: [
        { condition: 'without-incentive', actions: 100, men: 50, women: 48, other: 2 },
        { condition: 'with-incentive', actions: 25, men: 12, women: 12, other: 1 },
      ],
    },
    {
      ...MOCK_MUNICIPALITIES[1],
      records: [{ condition: 'without-incentive', actions: 30, men: 15, women: 15, other: 0 }],
    },
  ],
};

@Injectable({ providedIn: 'root' })
export class ManualCaptureService {
  // MOCK: reemplazar por llamadas reales (extendiendo BaseApiService de core/services)
  getCapturedMunicipalities(procedureId: string): Observable<CapturedMunicipality[]> {
    // structuredClone evita que la ventana modifique los datos de prueba al editar.
    return of(structuredClone(MOCK_CAPTURES[procedureId] ?? [])).pipe(delay(300));
  }

  // MOCK: reemplazar por búsqueda en el servidor sobre el catálogo completo
  searchMunicipalities(term: string): Observable<MunicipalityOption[]> {
    const search = normalize(term);
    const matches = search
      ? MOCK_MUNICIPALITIES.filter((m) => normalize(m.name).includes(search))
      : MOCK_MUNICIPALITIES;
    return of(matches.slice(0, 20)).pipe(delay(200));
  }

  // MOCK: reemplazar por llamada real de guardado
  saveCapture(procedureId: string, municipalities: CapturedMunicipality[]): Observable<void> {
    MOCK_CAPTURES[procedureId] = structuredClone(municipalities);
    return of(undefined).pipe(delay(400));
  }
}
