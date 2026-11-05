/**
 * Barrel export para todos los DTOs
 * Facilita imports de los contratos de autenticación y seguridad.
 *
 * Convención documental (anti-legacy):
 * - Describir entidades por dominio funcional (`iam.*`, `users.*`, `org.*`), no por nombres legacy.
 * - Mantener ejemplos de endpoint/payload alineados a servicios activos en `core/services`.
 * - Si cambia un contrato backend, actualizar comentario y DTO en el mismo commit.
 */

// Base DTOs
export * from './base.dto';

export * from './auth.dto';
export * from './two-factor.dto';
