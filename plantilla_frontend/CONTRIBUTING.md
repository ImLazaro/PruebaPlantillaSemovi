# Contribuir

## Flujo

1. Crear una rama para el cambio.
2. Revisar arquitectura y componentes antes de implementar.
3. Mantener cambios pequeños y enfocados.
4. Agregar o actualizar pruebas afectadas.
5. Ejecutar lint, build y pruebas.
6. Documentar cambios durables.

El workflow `Frontend CI` ejecuta estas validaciones automáticamente en cada
pull request y en los pushes a `main` o `master`.

## Cambios incompatibles

No cambiar nombres de DTOs de Identity, contratos públicos de componentes ni configuración de autenticación sin documentar una migración y actualizar consumidores.

## Pull requests

La descripción debe incluir objetivo, archivos afectados, validaciones ejecutadas, riesgos y cambios de contrato.
