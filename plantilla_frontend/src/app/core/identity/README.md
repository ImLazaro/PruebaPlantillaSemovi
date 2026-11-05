# Identidad

Este módulo publica los contratos de usuario, roles, permisos, aplicaciones
OAuth y datos de perfil usados por autenticación y autorización.

Los DTOs viven en este módulo. Los archivos equivalentes en `core/models` se
mantienen como adaptadores temporales para no romper consumidores existentes.
Las nuevas features deben importar los contratos desde `@core/identity`.
