# Inicio Coordinación (SISER 2.0)

Pantalla de inicio de la Coordinación Técnica. Ruta: `/coordinacion` (protegida con `secureAuthGuard`).

## Estructura

```text
inicio-coordinacion/
├── inicio-coordinacion.component.ts      # Página: header, navegación y composición
├── inicio-coordinacion.routes.ts         # Ruta + selección de fuente de datos (mock/API)
├── models/
│   ├── inicio-coordinacion.models.ts     # DTOs (contrato con backend)
│   └── inicio-coordinacion.estatus.ts    # Estatus → pill institucional, formato de fechas
├── services/
│   ├── inicio-coordinacion.data-source.ts    # Contrato abstracto (token de DI)
│   ├── inicio-coordinacion-api.service.ts    # Implementación HTTP (BaseApiService)
│   ├── inicio-coordinacion-mock.service.ts   # Datos ilustrativos
│   ├── inicio-coordinacion.providers.ts      # provideInicioCoordinacion({ useMock })
│   └── inicio-coordinacion.store.ts          # Estado con señales
└── components/
    ├── resumen-areas/            # 3 tarjetas KPI
    ├── monitor-cumplimiento/     # Tabla paginada de cumplimiento semanal
    ├── alertas-modificaciones/   # Tabla de alertas extemporáneas
    └── alerta-detalle-modal/     # Detalle y validación de alerta
```

## Conectar al backend

En `inicio-coordinacion.routes.ts` cambiar `provideInicioCoordinacion({ useMock: true })` a `useMock: false`.
Las peticiones van a `environment.apiUrl` y pasan por los interceptores de autenticación (Bearer/DPoP).

## Endpoints esperados

Base: `{apiUrl}/coordinacion/inicio`. Las listas usan el formato paginado estándar de `core/models/dto/base.dto.ts` (`{ data, meta }`).

| Método | Ruta | Query / Body | Respuesta |
|---|---|---|---|
| GET | `/resumen` | — | `ResumenAreasDto` |
| GET | `/cumplimiento` | `page`, `limit`, `sort?`, `order?`, `estatus?` | `PaginatedResponse<CumplimientoSemanalDto>` |
| GET | `/alertas` | `page`, `limit`, `sort?`, `order?`, `estatus?` | `PaginatedResponse<AlertaModificacionDto>` |
| PATCH | `/alertas/:id/validar` | `ValidarAlertaDto` | `AlertaModificacionDto` (con `estatus: 'recibido'`) |

### Ejemplos

```json
// GET /coordinacion/inicio/resumen
{ "totalAreas": 24, "areasAlDia": 18, "areasConRezago": 6 }

// GET /coordinacion/inicio/cumplimiento?page=1&limit=6
{
  "data": [{
    "id": "…", "areaId": "…", "area": "Dirección de Concesiones", "responsable": "M. Rojas",
    "semanaReportada": 41, "ultimaActualizacion": "2026-10-06T08:15:00Z", "estatus": "al_corriente"
  }],
  "meta": { "page": 1, "limit": 6, "total": 24, "totalPages": 4, "hasNext": true, "hasPrev": false }
}

// PATCH /coordinacion/inicio/alertas/:id/validar
{ "folio": "SEMOVI/SUB/045/2026", "observaciones": "Recibido por oficialía" }
```

Valores de `estatus`:
- Cumplimiento: `al_corriente`, `rezago_1_semana`, `rezago_2_mas_semanas`.
- Alerta: `pendiente`, `recibido`.

Errores: formato `ErrorResponse` estándar; `BaseApiService` lo traduce a mensaje y la UI lo muestra con opción de reintentar.

## Pendiente

Las secciones "Diálogo y concertación", "Reportes" y "Administración" aparecen deshabilitadas hasta que existan sus features.
