# Frontend Starter Kit Institucional

Plantilla Angular reutilizable para construir aplicaciones institucionales manteniendo una base técnica, visual y de seguridad consistente.

## Qué incluye

- Angular standalone con TypeScript estricto.
- Componentes UI institucionales reutilizables.
- Formularios, tablas, modales, notificaciones, exportación y validadores.
- Layout, navegación y tokens visuales.
- Integración OAuth/OIDC con PKCE, refresh, logout SSO, guards e interceptores.
- Contratos de identidad con usuarios, roles, permisos, aplicaciones OAuth, empleado, área, instalación, puesto y horario.
- Validaciones de archivos, servicios duplicados y tokens de diseño.

## Inicio rápido

```bash
pnpm run setup
pnpm start:http
```

`pnpm run setup` instala las dependencias con el lockfile y ejecuta un diagnóstico local. Antes de iniciar, copia la estructura de [environment.example.ts](src/environments/environment.example.ts) a `environment.ts` y configura las URLs del IAM y de la API.

Para validar el proyecto:

```bash
pnpm run lint
pnpm run build
pnpm test -- --watch=false --browsers=ChromeHeadless
```

También puedes comprobar el entorno sin compilar:

```bash
pnpm run doctor
```

## Arquitectura

```text
src/app/
├── auth/       # callback OAuth/OIDC
├── core/       # autenticación, HTTP, configuración y contratos
├── features/   # módulos opcionales y casos de uso
├── public/     # pantallas públicas
└── shared/     # componentes, formularios, layout y utilidades
```

Consulta [ARCHITECTURE.md](ARCHITECTURE.md) antes de modificar la estructura.

La detección y validación de dependencias está documentada en [DEPENDENCY_SECURITY.md](DEPENDENCY_SECURITY.md).

## Autenticación e identidad

La autenticación es parte oficial de la plantilla y no debe duplicarse en las features. Consulta [AUTHENTICATION.md](AUTHENTICATION.md) e [IDENTITY_CONTRACTS.md](IDENTITY_CONTRACTS.md) para conocer el flujo OAuth/OIDC, los contratos de perfil y las reglas para roles y permisos.

## Componentes

Antes de crear un componente, revisa [COMPONENTS.md](COMPONENTS.md) y el catálogo existente en `src/app/shared/components`.

## Desarrollo

Las reglas de implementación están en [DEVELOPMENT_GUIDELINES.md](DEVELOPMENT_GUIDELINES.md). Para contribuir, consulta [CONTRIBUTING.md](CONTRIBUTING.md).

## Crear una aplicación nueva

  El generador copia la plantilla fuera de este repositorio, excluye artefactos locales e instala las dependencias automáticamente:

```bash
pnpm run create-app -- ../mi-nueva-app "Mi Nueva App"
cd ../mi-nueva-app
  pnpm start:http
```

  El destino debe estar vacío o no existir. El script no sobrescribe aplicaciones existentes. Para omitir la instalación durante una validación automatizada, agrega `--skip-install`.

## Usar el paquete privado

El repositorio publica el generador `@elayiastv/create-frontend-app` en GitHub Packages cuando se crea un tag `vX.Y.Z`. Consulta la [guía de acceso a GitHub Packages](GITHUB_PACKAGES_ACCESS.md) para configurar la autenticación de forma segura:

Después crea una aplicación sin clonar este repositorio:

```bash
pnpm dlx @elayiastv/create-frontend-app ../mi-aplicacion "Mi Aplicación"
```

Para publicar una nueva versión desde el repositorio:

```bash
git tag v1.1.0
git push origin v1.1.0
```

El workflow [publish-package.yml](.github/workflows/publish-package.yml) ejecuta las validaciones y publica automáticamente esa versión en GitHub Packages. Las aplicaciones nuevas reciben la versión indicada; las aplicaciones existentes deben actualizarse mediante una revisión controlada de la plantilla.

## Agentes de IA

Las instrucciones obligatorias para agentes están en [AGENTS.md](AGENTS.md).

## Versionamiento

Los cambios relevantes se registran en [CHANGELOG.md](CHANGELOG.md) y deben seguir Semantic Versioning. Consulta [VERSIONING.md](VERSIONING.md) para publicar releases.
