# Autenticación e identidad

## Alcance

La plantilla conserva la integración con el servidor de autenticación. Este documento define el límite entre autenticación reutilizable y lógica de negocio.

## Componentes principales

- `src/app/core/auth/services/oidc-auth.service.ts`: flujo OAuth/OIDC, PKCE, tokens, refresh, logout, userinfo y acciones de cuenta.
- `src/app/core/auth/guards/secure-auth.guard.ts`: protección de rutas.
- `src/app/core/auth/interceptors/secure-auth-fn.interceptor.ts`: Bearer/DPoP, refresh y manejo de `401`.
- `src/app/auth/oauth-callback/`: finalización del redirect OAuth.
- `src/environments/environment.ts`: endpoints y parámetros de Identity por entorno.

## Contrato de sesión

La información de usuario se obtiene de Identity y se normaliza antes de exponerla a la UI. No se debe duplicar este mapeo en componentes.

Los tokens no deben persistirse en Web Storage. Las operaciones sensibles de cuenta deben delegarse a los flujos de Identity.

## Uso de rutas protegidas

```ts
{
  path: 'mi-feature',
  loadComponent: () => import('./features/mi-feature/mi-feature.component')
    .then(m => m.MiFeatureComponent),
  canActivate: [secureAuthGuard],
}
```

## Reglas

- No implementar un login alternativo dentro de una feature.
- No enviar tokens manualmente desde componentes.
- No crear otro servicio para roles o permisos si el dato ya proviene de `OidcAuthService`.
- El backend sigue siendo la autoridad de autorización; la UI solo controla visibilidad y experiencia.
- Los roles y permisos deben conservar sus nombres y estructura de contrato.
