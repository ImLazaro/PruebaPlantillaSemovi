import { Observable } from 'rxjs';
import {
  AlertaModificacionDto,
  AlertasPage,
  AlertasQuery,
  CumplimientoPage,
  CumplimientoQuery,
  ResumenAreasDto,
  ValidarAlertaDto,
} from '../models/inicio-coordinacion.models';

/**
 * Contrato de acceso a datos de la pantalla Inicio Coordinación.
 *
 * Se usa como token de inyección: la ruta decide si se provee la
 * implementación HTTP real o la de datos ilustrativos (mock).
 */
export abstract class InicioCoordinacionDataSource {
  abstract getResumen(): Observable<ResumenAreasDto>;
  abstract getCumplimiento(query: CumplimientoQuery): Observable<CumplimientoPage>;
  abstract getAlertas(query: AlertasQuery): Observable<AlertasPage>;
  abstract validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto>;
}
