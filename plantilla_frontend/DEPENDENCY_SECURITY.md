# Seguridad de dependencias

El repositorio usa Dependabot y GitHub Actions para detectar dependencias vulnerables, probar actualizaciones y reportar fallos.

## Qué hace Dependabot

La configuración está en `.github/dependabot.yml` y revisa semanalmente:

- Dependencias npm del proyecto.
- Acciones utilizadas por GitHub Actions.
- Actualizaciones de Angular agrupadas.
- Actualizaciones de TypeScript y herramientas de lint agrupadas.

Cuando encuentra una actualización, Dependabot abre un Pull Request con el cambio.

## Qué valida GitHub Actions

El workflow `.github/workflows/dependency-security.yml` ejecuta:

```bash
pnpm install --frozen-lockfile
pnpm run security:audit
pnpm run lint
pnpm run build
pnpm run test:ci
```

También revisa cambios de dependencias en Pull Requests y bloquea cambios con vulnerabilidades de severidad alta.

## Activar alertas y actualizaciones

En GitHub, dentro del repositorio:

1. Abrir **Settings → Advanced Security** o **Code security and analysis**.
2. Activar **Dependabot alerts**.
3. Activar **Dependabot security updates**.
4. Confirmar que el gráfico de dependencias esté habilitado.

## Recibir notificaciones por correo

Cada programador debe revisar en su cuenta de GitHub:

1. Abrir **Settings → Notifications**.
2. En **System**, activar los correos de **Dependabot alerts**.
3. En **Watching**, mantener habilitadas las notificaciones del repositorio.
4. En **Actions**, activar los correos de workflows fallidos si se desea recibir avisos de auditorías o pruebas fallidas.

GitHub enviará correos cuando Dependabot encuentre vulnerabilidades, abra actualizaciones o un workflow falle. No se requiere un servidor SMTP ni guardar credenciales de correo en el repositorio.

## Validación manual

Para revisar dependencias desde un equipo local:

```bash
pnpm run security:audit
```

Para revisar toda la propuesta de actualización:

```bash
pnpm run lint
pnpm run build
pnpm run test:ci
```

No se debe aprobar una actualización automática sin revisar el Pull Request y sus resultados de CI, especialmente si modifica Angular, autenticación, identidad o contratos de perfil.
