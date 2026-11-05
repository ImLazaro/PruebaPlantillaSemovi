# Catálogo de componentes

## Componentes base

Los componentes reutilizables se encuentran en `src/app/shared/components`. Las familias principales son:

- botones, grupos de botones y acciones confirmables;
- inputs, selects, autocompletados, checkboxes y pickers;
- formularios simples, validados, modales y stepper;
- tablas, filtros, paginación, exportación y acciones masivas;
- tarjetas, banners, badges, métricas, estados y skeletons;
- modales, drawer, alertas, tooltips y notificaciones;
- iconos, avatar, QR, visor JSON, timeline y utilidades visuales.

## Cómo elegir

1. Buscar primero el componente por familia y revisar su README o tipos.
2. Usar contratos tipados (`ButtonConfig`, `TableConfig`, `UiSize`, `UiState`, etc.).
3. Mantener la lógica de datos en la feature y la presentación en `shared`.
4. Reutilizar tokens semánticos de `src/assets/css/semantic-tokens.css`.
5. Agregar un componente nuevo solo si no existe una variante razonable.

## Nuevo componente

- Debe ser standalone.
- Debe tener inputs y outputs explícitos.
- Debe soportar estados de carga, vacío, error y deshabilitado cuando aplique.
- Debe incluir accesibilidad básica y prueba cuando tenga interacción.
- Debe documentar uso, contrato y límites.
- No debe depender de una ruta o entidad específica.
