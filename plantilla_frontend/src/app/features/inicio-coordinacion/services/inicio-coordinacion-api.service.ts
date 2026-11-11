import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService, QueryParams } from '@/app/core/services/base-api.service';
import {
  AlertaModificacionDto,
  AlertasPage,
  AlertasQuery,
  CumplimientoPage,
  CumplimientoQuery,
  CumplimientoSemanalDto,
  ResumenAreasDto,
  ValidarAlertaDto,
} from '../models/inicio-coordinacion.models';
import { InicioCoordinacionDataSource } from './inicio-coordinacion.data-source';

/**
 * Implementación HTTP contra el gateway (`environment.apiUrl`).
 * Autenticación (Bearer/DPoP) y manejo de errores los aportan
 * los interceptores de `core` y `BaseApiService`.
 */
@Injectable()
export class InicioCoordinacionApiService
  extends BaseApiService<CumplimientoSemanalDto>
  implements InicioCoordinacionDataSource {

  protected readonly endpoint = '/coordinacion/inicio';

  constructor() {
    super(inject(HttpClient));
  }

  getResumen(): Observable<ResumenAreasDto> {
    return this.get<ResumenAreasDto>('/resumen');
  }

  getCumplimiento(query: CumplimientoQuery): Observable<CumplimientoPage> {
    return this.get<CumplimientoPage>('/cumplimiento', toParams(query));
  }

  getAlertas(query: AlertasQuery): Observable<AlertasPage> {
    return this.get<AlertasPage>('/alertas', toParams(query));
  }

  validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto> {
    return this.patch<AlertaModificacionDto>(`/alertas/${encodeURIComponent(id)}/validar`, body);
  }
}

function toParams(query: CumplimientoQuery | AlertasQuery): QueryParams {
  return {
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    order: query.order,
    estatus: query.estatus,
  };
}
