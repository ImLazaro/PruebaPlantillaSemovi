import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Provider } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { BaseApiService } from '@/app/core/services/base-api.service';
import {
  ContextoActualizacionDto,
  SolicitudActualizacionDto,
  SolicitudActualizacionRespuestaDto,
  TramiteCifrasDto,
} from '../models/actualizacion-extemporanea-cifras.model';

// =====================================================================
// Contrato de acceso a datos (token de DI)
// =====================================================================

export abstract class ActualizacionExtemporaneaDataSource {
  /** `true` cuando los datos son ilustrativos (mock). */
  abstract readonly esDemo: boolean;
  abstract getContexto(): Observable<ContextoActualizacionDto>;
  abstract getTramites(semana: number, anio: number): Observable<TramiteCifrasDto[]>;
  abstract enviarSolicitud(datos: SolicitudActualizacionDto, oficio: File): Observable<SolicitudActualizacionRespuestaDto>;
}

/** `useMock: true` usa datos ilustrativos; `false` consume `environment.apiUrl`. */
export function provideActualizacionExtemporanea(options: { useMock: boolean }): Provider[] {
  return [
    {
      provide: ActualizacionExtemporaneaDataSource,
      useClass: options.useMock ? ActualizacionExtemporaneaMockService : ActualizacionExtemporaneaApiService,
    },
  ];
}

// =====================================================================
// Implementación HTTP (endpoints documentados en el modelo)
// =====================================================================

@Injectable()
export class ActualizacionExtemporaneaApiService
  extends BaseApiService<TramiteCifrasDto>
  implements ActualizacionExtemporaneaDataSource {

  readonly esDemo = false;
  protected readonly endpoint = '/actualizacion-extemporanea';

  constructor() {
    super(inject(HttpClient));
  }

  getContexto(): Observable<ContextoActualizacionDto> {
    return this.get<ContextoActualizacionDto>('/contexto');
  }

  getTramites(semana: number, anio: number): Observable<TramiteCifrasDto[]> {
    return this.get<TramiteCifrasDto[]>('/tramites', { semana, anio });
  }

  enviarSolicitud(datos: SolicitudActualizacionDto, oficio: File): Observable<SolicitudActualizacionRespuestaDto> {
    const body = new FormData();
    body.append('datos', JSON.stringify(datos));
    body.append('oficio', oficio, oficio.name);
    return this.post<SolicitudActualizacionRespuestaDto>('/solicitudes', body);
  }
}

// =====================================================================
// Implementación con datos ilustrativos
// =====================================================================

const LATENCIA_MS = 350;

@Injectable()
export class ActualizacionExtemporaneaMockService implements ActualizacionExtemporaneaDataSource {
  readonly esDemo = true;

  getContexto(): Observable<ContextoActualizacionDto> {
    return of<ContextoActualizacionDto>({
      area: { id: 'area-1', nombre: 'Departamento de Concesiones' },
      semanasVencidas: [
        { semana: 39, anio: 2026, fechaInicio: '2026-09-20', fechaFin: '2026-09-26' },
        { semana: 38, anio: 2026, fechaInicio: '2026-09-13', fechaFin: '2026-09-19' },
        { semana: 37, anio: 2026, fechaInicio: '2026-09-06', fechaFin: '2026-09-12' },
      ],
    }).pipe(delay(LATENCIA_MS));
  }

  getTramites(): Observable<TramiteCifrasDto[]> {
    return of<TramiteCifrasDto[]>([
      { id: 't-41', clave: 'CON-2026-041', tramite: 'Concesión de uso de vía pública', cifras: null },
      { id: 't-42', clave: 'CON-2026-042', tramite: 'Permiso de obra menor', cifras: null },
      { id: 't-43', clave: 'CON-2026-043', tramite: 'Renovación de concesión comercial', cifras: null },
      { id: 't-44', clave: 'CON-2026-044', tramite: 'Autorización de evento temporal', cifras: null },
      { id: 't-45', clave: 'CON-2026-045', tramite: 'Modificación de planos de obra', cifras: null },
    ]).pipe(delay(LATENCIA_MS));
  }

  enviarSolicitud(): Observable<SolicitudActualizacionRespuestaDto> {
    return of<SolicitudActualizacionRespuestaDto>({
      id: `sol-${Date.now()}`,
      estatus: 'pendiente_validacion',
    }).pipe(delay(LATENCIA_MS));
  }
}
