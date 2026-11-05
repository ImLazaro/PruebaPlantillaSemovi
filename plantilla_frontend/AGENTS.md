# Instrucciones para agentes

Antes de modificar el proyecto:

1. Leer `ARCHITECTURE.md`, `DEVELOPMENT_GUIDELINES.md` y el documento específico del área.
2. Inspeccionar solo archivos relevantes.
3. Reutilizar componentes, servicios, DTOs y patrones existentes.
4. Preservar la autenticación OAuth/OIDC y los contratos de Identity.
5. No eliminar usuarios, roles, permisos, aplicaciones OAuth ni datos de perfil sin confirmar que no son parte del contrato de autenticación.
6. Mantener UTF-8 y no introducir mojibake.
7. Validar con lint, build y pruebas afectadas.
8. Reportar limitaciones y fallos preexistentes por separado.
