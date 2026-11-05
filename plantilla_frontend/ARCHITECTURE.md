# Arquitectura del Frontend Starter Kit

## Propósito

Este repositorio es una plantilla Angular reutilizable. Su núcleo contiene infraestructura, autenticación, componentes compartidos, estilos y reglas de calidad. La lógica de negocio de una aplicación concreta debe vivir en `src/app/features` y no debe contaminar `core` ni `shared`.

## Estructura actual

```text
src/app/
├── auth/       # Callback y pantallas de integración OAuth/OIDC
├── core/       # Infraestructura singleton y contratos transversales
├── features/   # Funcionalidades opcionales o propias de la aplicación
├── public/     # Pantallas públicas
└── shared/     # UI, layouts, formularios, tablas y utilidades reutilizables
```

## Límites de responsabilidad

- `core`: autenticación, HTTP, configuración, modelos, servicios singleton, guards e interceptores.
- `shared`: componentes sin conocimiento de un dominio concreto. Puede recibir datos por `@Input` y emitir eventos, pero no debe llamar directamente a endpoints de Identity o de negocio.
- `features`: composición de pantallas y casos de uso. Aquí se conectan servicios, rutas y contratos de una aplicación.
- `public`: contenido accesible sin sesión.
- `environments`: configuración por entorno; no contiene secretos.

## Autenticación e identidad

La autenticación se conserva como infraestructura oficial de la plantilla. OAuth/OIDC, PKCE, refresh, logout, guards, interceptores, DPoP, 2FA, passkeys y acciones de cuenta deben evolucionar sin cambiar los contratos públicos del perfil.

El modelo de identidad incluye usuarios, roles administrativos, permisos, aplicaciones OAuth, empleado, área, instalación, puesto, horario y módulos relacionados. Estos datos son parte del contrato de autenticación/autorización, aunque las pantallas administrativas sean opcionales.

## Reglas de dependencias

1. `shared` no importa `features`.
2. `core` no importa `features`.
3. Una feature puede importar `core` y `shared`.
4. Los componentes compartidos no conocen DTOs de una feature.
5. Los endpoints de Identity se consumen desde servicios de autenticación o identidad, no desde componentes.
6. Antes de crear un componente, servicio o validador se debe buscar una implementación existente.

## Servicios canónicos y adaptadores

- `core/services/base-api.service.ts` es la implementación canónica de API.
- `core/services/app-config.service.ts` es la implementación canónica de configuración.
- `shared/lib/services/icon.service.ts` es la implementación canónica de iconos.
- `shared/lib/services/notification.service.ts` es la implementación canónica de notificaciones.
- Los archivos equivalentes en otras carpetas solo deben reexportar la implementación canónica para compatibilidad; no deben declarar otra clase con el mismo propósito.

## Evolución prevista

La autenticación e identidad ya tienen fronteras públicas en `core/auth` y
`core/identity`. Las rutas antiguas se mantienen como adaptadores temporales.
No se deben importar las implementaciones internas directamente desde nuevas
features.
