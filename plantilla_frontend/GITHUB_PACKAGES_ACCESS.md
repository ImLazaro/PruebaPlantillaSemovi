# Acceso al paquete privado

El generador privado se publica en GitHub Packages con el nombre:

```text
@elayiastv/create-frontend-app
```

Repositorio de origen:

```text
https://github.com/ElayiasTV/plantilla_frontend
```

## 1. Crear un token de GitHub

Cada programador debe crear un token personal en GitHub:

1. Abrir **Settings**.
2. Entrar en **Developer settings**.
3. Seleccionar **Personal access tokens → Tokens classic**.
4. Crear un token con el permiso:

```text
read:packages
```

Si la organización utiliza SSO, el token también debe autorizarse para la organización.

El token no debe compartirse ni subirse al repositorio.

> GitHub Packages requiere un **Personal Access Token classic**. Un token fine-grained no sustituye este requisito para el registro npm.

## 2. Configurar el acceso

Ejecutar en una terminal:

```bash
npm login --scope=@elayiastv --auth-type=legacy --registry=https://npm.pkg.github.com
```

Responder con:

```text
Username: ElayiasTV
Password: <TOKEN_DE_GITHUB>
Email: <CORREO_DE_GITHUB>
```

El comando guarda la credencial en la configuración personal de npm del programador.

## 3. Verificar el acceso

```bash
pnpm view @elayiastv/create-frontend-app version --registry=https://npm.pkg.github.com
```

Si el acceso es correcto, se mostrará la versión publicada, por ejemplo:

```text
1.0.0
```

## 4. Crear una aplicación

```bash
pnpm dlx --package=@elayiastv/create-frontend-app create-frontend-app ../mi-aplicacion "Mi Aplicación"
```

El comando descarga el paquete, copia la plantilla e instala las dependencias de la nueva aplicación.

Para usar una versión específica:

```bash
pnpm dlx --package=@elayiastv/create-frontend-app@1.0.0 create-frontend-app ../mi-aplicacion "Mi Aplicación"
```

## 5. Configuración opcional del proyecto

El archivo `.npmrc` del proyecto puede contener únicamente el registro:

```ini
@elayiastv:registry=https://npm.pkg.github.com
```

No se debe agregar el token directamente a ese archivo, porque podría quedar versionado en Git.

## 6. Publicar una nueva versión

Desde el repositorio de la plantilla:

```bash
git add .
git commit -m "Describe el cambio"
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

El workflow `.github/workflows/publish-package.yml` valida y publica automáticamente la versión etiquetada en GitHub Packages.

Las aplicaciones nuevas pueden utilizar la nueva versión. Las aplicaciones existentes no se actualizan automáticamente; deben incorporar los cambios mediante una revisión controlada.

## Solución al error `E403 Permission permission_denied`

Si npm muestra:

```text
403 Forbidden - Permission permission_denied: The token provided does not match expected scopes
```

1. Revoca el token que está guardado actualmente.
2. Crea un **Personal Access Token classic** nuevo.
3. Marca el permiso `read:packages`.
4. Autoriza el token para SSO si la organización lo solicita.
5. Cierra la sesión del registro:

```bash
npm logout --scope=@elayiastv --registry=https://npm.pkg.github.com
```

6. Vuelve a autenticarte:

```bash
npm login --scope=@elayiastv --auth-type=legacy --registry=https://npm.pkg.github.com
```

7. Verifica el acceso:

```bash
pnpm view @elayiastv/create-frontend-app version --registry=https://npm.pkg.github.com
```

El usuario de GitHub también debe tener permiso de lectura sobre el paquete privado o sobre el repositorio al que está vinculado.

Si la aplicación se genera desde el paquete publicado, el instalador usa `--no-frozen-lockfile` porque los registros npm no incluyen `pnpm-lock.yaml` dentro del paquete distribuido. Si se genera desde el repositorio fuente y el lockfile está presente, conserva la instalación reproducible con `--frozen-lockfile`.

## Dar acceso a otro programador

Cada programador debe utilizar su propia cuenta y su propio token. No se debe compartir un token personal.

### Opción recomendada: acceso al repositorio

Como el paquete está vinculado al repositorio `ElayiasTV/plantilla_frontend`:

1. Abrir el repositorio en GitHub.
2. Ir a **Settings → Collaborators**.
3. Seleccionar **Add people**.
4. Agregar el usuario o equipo del programador.
5. Asignar el permiso necesario:
   - **Read**: descargar la plantilla y el paquete.
   - **Write**: contribuir al repositorio.
   - **Maintain/Admin**: solo para responsables del proyecto.

El permiso de lectura del repositorio permite acceder al paquete cuando este conserva los permisos heredados del repositorio.

### Si el paquete tiene permisos propios

Si se cambiaron los permisos heredados:

1. Abrir el paquete `create-frontend-app` en GitHub.
2. Entrar en **Package settings**.
3. Buscar **Manage access**.
4. Agregar al programador o equipo.
5. Asignar permiso **Read**.

### Configuración del programador

El programador debe crear su propio **Personal Access Token classic** con `read:packages` y, si aplica, autorizarlo para SSO. Después debe ejecutar:

```bash
npm login --scope=@elayiastv --auth-type=legacy --registry=https://npm.pkg.github.com
```

Finalmente puede verificar el acceso:

```bash
pnpm view @elayiastv/create-frontend-app version --registry=https://npm.pkg.github.com
```

## Seguridad

- No guardar tokens en el repositorio.
- No incluir tokens en `package.json`, `.npmrc` del proyecto ni archivos de configuración compartidos.
- Usar `read:packages` para descargar y `write:packages` únicamente en el workflow de publicación.
- Revocar inmediatamente un token si se expone.
