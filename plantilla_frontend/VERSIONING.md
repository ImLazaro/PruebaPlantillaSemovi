# Versionamiento y releases

La plantilla usa Semantic Versioning (`MAJOR.MINOR.PATCH`):

- `MAJOR`: cambio incompatible en contratos, componentes, autenticación o configuración.
- `MINOR`: funcionalidad nueva compatible.
- `PATCH`: corrección compatible.

Antes de publicar una versión:

1. Actualizar `version` en `package.json`.
2. Registrar cambios en `CHANGELOG.md`.
3. Ejecutar `pnpm run ci`.
4. Crear un tag anotado, por ejemplo `v1.1.0`.
5. Publicar el artefacto o repositorio según el canal institucional.

Las aplicaciones derivadas deben registrar la versión de plantilla de la que
partieron y resolver actualizaciones por migraciones explícitas, nunca copiando
archivos sobre lógica de negocio existente.
