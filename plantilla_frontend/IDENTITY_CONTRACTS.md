# Contratos de identidad

## Datos que se conservan

La plantilla no elimina los datos necesarios para identificar y autorizar al usuario:

- usuario y estado de cuenta;
- rol principal y colección de roles;
- permisos efectivos y permisos por audiencia;
- aplicaciones OAuth y audiencias;
- empleado, área, instalación, puesto y horario;
- estado de verificación, 2FA, último acceso y cambio de contraseña.

## Fuentes

Los contratos principales están en:

- `src/app/core/identity/models/dto/auth.dto.ts`
- `src/app/core/identity/models/dto/two-factor.dto.ts`
- `src/app/core/identity/models/auth.model.ts`

Las rutas anteriores en `core/models` permanecen como adaptadores temporales de
compatibilidad.

## Regla de compatibilidad

Una aplicación derivada puede agregar campos, pero no debe renombrar ni eliminar campos consumidos por autenticación, guards, header, perfil o autorización sin una migración versionada.

Los DTOs de Identity son contratos de integración, no entidades de negocio de una feature. Las pantallas de usuarios, roles, permisos y aplicaciones pueden ser opcionales, pero el contrato permanece disponible para las aplicaciones que lo necesiten.
