# Autenticación

Este es el punto de entrada público para OAuth/OIDC, PKCE, sesión, guards,
interceptores, DPoP, 2FA y acciones sensibles de cuenta.

Las implementaciones viven en este módulo. Las rutas antiguas de `core/services`,
`core/guards` y `core/interceptors` se mantienen como adaptadores temporales para
compatibilidad. Las nuevas features deben importar desde `@core/auth` y no
acoplarse a las rutas internas de implementación.
