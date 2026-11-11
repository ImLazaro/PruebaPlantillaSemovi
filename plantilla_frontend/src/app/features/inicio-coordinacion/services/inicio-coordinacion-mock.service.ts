import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { PaginatedResponse } from '@/app/core/models/dto';
import {
  AlertaModificacionDto,
  AlertasPage,
  AlertasQuery,
  CumplimientoPage,
  CumplimientoQuery,
  CumplimientoSemanalDto,
  EstatusCumplimiento,
  ResumenAreasDto,
  ValidarAlertaDto,
} from '../models/inicio-coordinacion.models';
import { InicioCoordinacionDataSource } from './inicio-coordinacion.data-source';

const LATENCIA_MS = 350;

const AREAS: Array<[string, string, number, string, EstatusCumplimiento]> = [
  ['Dirección de Concesiones', 'M. Rojas', 41, '2026-10-06T08:15:00', 'al_corriente'],
  ['Unidad de Seguimiento', 'A. Soto', 40, '2026-10-05T17:40:00', 'rezago_1_semana'],
  ['Área de Informática', 'J. Mora', 40, '2026-10-04T09:10:00', 'rezago_1_semana'],
  ['Centro de Atención Ciudadana', 'L. Araya', 38, '2026-10-03T11:25:00', 'rezago_2_mas_semanas'],
  ['Departamento Jurídico', 'P. Vargas', 37, '2026-10-02T14:50:00', 'rezago_2_mas_semanas'],
  ['Oficina de Planificación', 'C. Gómez', 41, '2026-10-06T07:55:00', 'al_corriente'],
  ['Dirección de Transporte Público', 'R. Díaz', 41, '2026-10-06T09:30:00', 'al_corriente'],
  ['Subdirección de Licencias', 'E. Pérez', 41, '2026-10-06T10:05:00', 'al_corriente'],
  ['Unidad de Transparencia', 'S. Luna', 41, '2026-10-05T16:20:00', 'al_corriente'],
  ['Dirección de Movilidad Activa', 'F. Ortiz', 41, '2026-10-06T08:40:00', 'al_corriente'],
  ['Coordinación de Comunicación', 'V. Ramos', 39, '2026-09-29T12:10:00', 'rezago_1_semana'],
  ['Dirección de Seguridad Vial', 'H. Cruz', 41, '2026-10-06T11:00:00', 'al_corriente'],
  ['Subdirección de Control Vehicular', 'G. Núñez', 41, '2026-10-05T18:15:00', 'al_corriente'],
  ['Unidad de Proyectos Especiales', 'D. Ríos', 41, '2026-10-06T09:45:00', 'al_corriente'],
  ['Dirección de Administración', 'K. León', 41, '2026-10-06T07:30:00', 'al_corriente'],
  ['Subdirección de Recursos Humanos', 'N. Salas', 41, '2026-10-05T15:55:00', 'al_corriente'],
  ['Subdirección de Recursos Financieros', 'O. Vega', 41, '2026-10-06T10:25:00', 'al_corriente'],
  ['Órgano Interno de Control', 'T. Campos', 36, '2026-09-22T13:35:00', 'rezago_2_mas_semanas'],
  ['Dirección de Infraestructura', 'B. Flores', 41, '2026-10-06T12:05:00', 'al_corriente'],
  ['Unidad de Estadística', 'I. Mejía', 41, '2026-10-05T17:05:00', 'al_corriente'],
  ['Dirección de Evaluación', 'W. Castro', 41, '2026-10-06T08:55:00', 'al_corriente'],
  ['Subdirección de Normatividad', 'Y. Reyes', 41, '2026-10-06T09:15:00', 'al_corriente'],
  ['Unidad de Igualdad Sustantiva', 'Z. Torres', 41, '2026-10-05T14:30:00', 'al_corriente'],
  ['Dirección de Atención a Quejas', 'U. Medina', 41, '2026-10-06T10:50:00', 'al_corriente'],
];

/**
 * Datos ilustrativos para desarrollar la pantalla sin backend.
 * Respeta el mismo contrato y la misma paginación que la API real.
 */
@Injectable()
export class InicioCoordinacionMockService implements InicioCoordinacionDataSource {
  private readonly cumplimiento: CumplimientoSemanalDto[] = AREAS.map(
    ([area, responsable, semanaReportada, ultimaActualizacion, estatus], i) => ({
      id: `cum-${i + 1}`,
      areaId: `area-${i + 1}`,
      area,
      responsable,
      semanaReportada,
      ultimaActualizacion,
      estatus,
    }),
  );

  private alertas: AlertaModificacionDto[] = [
    alerta(1, 'Dirección de Concesiones', '2026-10-02T14:20:00', 39, 'SEMOVI/SUB/045/2026', 'pendiente'),
    alerta(2, 'Unidad de Seguimiento', '2026-10-01T09:05:00', 38, 'SEMOVI/US/012/2026', 'recibido'),
    alerta(3, 'Área de Informática', '2026-09-30T17:45:00', 37, null, 'pendiente'),
    alerta(4, 'Centro de Atención Ciudadana', '2026-09-29T10:30:00', 36, null, 'recibido'),
    alerta(5, 'Departamento Jurídico', '2026-09-28T08:10:00', 35, null, 'pendiente'),
    alerta(6, 'Oficina de Planificación', '2026-09-27T16:40:00', 34, null, 'recibido'),
  ];

  getResumen(): Observable<ResumenAreasDto> {
    const areasAlDia = this.cumplimiento.filter(c => c.estatus === 'al_corriente').length;
    return of({
      totalAreas: this.cumplimiento.length,
      areasAlDia,
      areasConRezago: this.cumplimiento.length - areasAlDia,
    }).pipe(delay(LATENCIA_MS));
  }

  getCumplimiento(query: CumplimientoQuery): Observable<CumplimientoPage> {
    const items = query.estatus
      ? this.cumplimiento.filter(c => c.estatus === query.estatus)
      : this.cumplimiento;
    return of(paginate(items, query.page, query.limit)).pipe(delay(LATENCIA_MS));
  }

  getAlertas(query: AlertasQuery): Observable<AlertasPage> {
    const items = query.estatus
      ? this.alertas.filter(a => a.estatus === query.estatus)
      : this.alertas;
    return of(paginate(items, query.page, query.limit)).pipe(delay(LATENCIA_MS));
  }

  validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto> {
    const actual = this.alertas.find(a => a.id === id);
    if (!actual) {
      return throwError(() => ({ message: 'Alerta no encontrada', status: 404 }));
    }
    const actualizada: AlertaModificacionDto = {
      ...actual,
      estatus: 'recibido',
      folio: body.folio?.trim() || actual.folio,
    };
    this.alertas = this.alertas.map(a => (a.id === id ? actualizada : a));
    return of(actualizada).pipe(delay(LATENCIA_MS));
  }
}

function alerta(
  n: number,
  area: string,
  fechaHora: string,
  semanaAfectada: number,
  folio: string | null,
  estatus: AlertaModificacionDto['estatus'],
): AlertaModificacionDto {
  return {
    id: `alt-${n}`,
    areaId: `area-${n}`,
    area,
    fechaHora,
    semanaAfectada,
    folio,
    estatus,
    descripcion: `Se modificó el reporte de la semana ${semanaAfectada} después de su cierre.`,
  };
}

function paginate<T>(items: T[], page = 1, limit = 10): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: {
      page: current,
      limit,
      total,
      totalPages,
      hasNext: current < totalPages,
      hasPrev: current > 1,
    },
  };
}
