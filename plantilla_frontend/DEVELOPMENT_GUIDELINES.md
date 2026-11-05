# Guías de desarrollo

## Antes de programar

1. Leer `ARCHITECTURE.md` y el documento específico del área.
2. Buscar componentes, servicios, DTOs y validadores existentes.
3. Confirmar si el cambio pertenece a `core`, `shared` o `features`.
4. Identificar si afecta el contrato de autenticación o identidad.

## Código

- Preferir componentes standalone y APIs funcionales de Angular.
- Mantener TypeScript estricto.
- Evitar duplicar servicios, DTOs y reglas de validación.
- Centralizar llamadas HTTP en servicios.
- Usar RxJS y señales con una estrategia consistente por feature.
- No poner URLs, tokens ni secretos en componentes.
- Mantener textos en UTF-8 y revisar mojibake antes de entregar.

## UI y accesibilidad

- Usar el sistema visual institucional y tokens existentes.
- Mantener una acción primaria clara.
- Implementar estados de carga, vacío, error y éxito.
- Usar labels, foco visible, roles ARIA y navegación por teclado.
- Diseñar responsive reorganizando prioridades, no solo reduciendo tamaños.

## Validación obligatoria

```text
pnpm run lint
pnpm run build
pnpm test -- --watch=false --browsers=ChromeHeadless
```

Si una validación no puede ejecutarse, debe reportarse la causa exacta.

## Crear una aplicación derivada

Usar `node tools/create-app.mjs <destino> <nombre>` desde la raíz de la
plantilla. No copiar manualmente `node_modules`, `dist` ni `.angular`; el
generador los excluye para que cada aplicación instale sus propias dependencias.
