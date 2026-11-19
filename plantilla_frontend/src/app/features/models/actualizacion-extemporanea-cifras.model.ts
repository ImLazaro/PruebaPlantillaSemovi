/**
 * Contratos de la pantalla Actualización Extemporánea de Cifras (SISER 2.0).
 *
 * Endpoints esperados (base `{apiUrl}/actualizacion-extemporanea`):
 * - GET  /contexto                       → ContextoActualizacionDto (área del usuario y semanas vencidas)
 * - GET  /tramites?semana=39&anio=2026   → TramiteCifrasDto[]
 * - POST /solicitudes  (multipart/form-data)
 *        · datos:  JSON de SolicitudActualizacionDto
 *        · oficio: PDF del oficio justificativo
 *        → SolicitudActualizacionRespuestaDto
 *
 * Toda solicitud genera registro de auditoría en backend y queda pendiente de
 * validación por Coordinación Técnica.
 */

/** Cifras desagregadas: Hombres / Mujeres / Otros. */
export interface CifrasHMO {
  hombres: number;
  mujeres: number;
  otros: number;
}

export interface SemanaVencidaDto {
  semana: number;
  anio: number;
  /** Fecha ISO 8601 (inicio de la semana). */
  fechaInicio: string;
  /** Fecha ISO 8601 (fin de la semana). */
  fechaFin: string;
}

/** Área asignada al usuario; se muestra bloqueada (solo lectura). */
export interface AreaBloqueadaDto {
  id: string;
  nombre: string;
}

/** GET /actualizacion-extemporanea/contexto */
export interface ContextoActualizacionDto {
  area: AreaBloqueadaDto;
  semanasVencidas: SemanaVencidaDto[];
}

/** Elemento de GET /actualizacion-extemporanea/tramites */
export interface TramiteCifrasDto {
  id: string;
  clave: string;
  tramite: string;
  /** Cifras registradas para la semana; `null` si no hay captura. */
  cifras: CifrasHMO | null;
}

export interface CambioCifrasDto {
  tramiteId: string;
  cifras: CifrasHMO;
}

/** Parte `datos` de POST /actualizacion-extemporanea/solicitudes */
export interface SolicitudActualizacionDto {
  areaId: string;
  semana: number;
  anio: number;
  /** Folio del memorándum u oficio de soporte. */
  folio: string;
  cambios: CambioCifrasDto[];
}

export interface SolicitudActualizacionRespuestaDto {
  id: string;
  estatus: 'pendiente_validacion';
}
