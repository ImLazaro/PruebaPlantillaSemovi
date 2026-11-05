# Changelog

## [Unreleased]

### Added

- Documentación inicial de arquitectura, autenticación, contratos de identidad, componentes y guías de desarrollo.
- Entradas públicas `core/auth` y `core/identity`.
- Workflow de CI para instalación, lint, build y pruebas.
- Generador reproducible `tools/create-app.mjs` para aplicaciones derivadas.
- Validación automatizada de generación de aplicaciones.
- Comandos `setup`, `doctor` y `create-app` para facilitar el onboarding.
- Plantilla de entorno local y plantilla de Pull Request.
- `create-app` instala automáticamente las dependencias de la aplicación generada.
- Preparación para publicar `@elayiastv/create-frontend-app` en GitHub Packages.
- El generador publicado instala correctamente aunque el paquete no incluya `pnpm-lock.yaml`.
- Automatización de auditoría de dependencias con Dependabot y GitHub Actions.

### Changed

- La plantilla conserva explícitamente la autenticación y el contrato completo del perfil de usuario.
- Actualiza dependencias compatibles dentro de Angular 20 y reduce la auditoría a vulnerabilidades moderadas.
- Alinea `@types/node` con Node 26 para eliminar la advertencia de compatibilidad de Vite.

### Removed

- Directorios vacíos heredados de módulos no incluidos en la implementación actual.
