# Guía de contenido extremo en componentes base y compuestos

## Objetivo
Definir límites prácticos y recomendaciones para strings muy largos, labels extensos y errores de backend reales sin degradar UX ni accesibilidad.

## Componentes base

### `app-simple-header`
- **Riesgo:** títulos/subtítulos extensos rompen layout en móvil.
- **Estrategia activa:**
  - Móvil: `break-words` para evitar corte destructivo.
  - `sm+`: `truncate` para mantener altura compacta.
  - Preservar valor completo en `title` del elemento.
- **Recomendación con contenido extremo:** evitar texto “tokenizado” sin espacios; si llega, mantener `overflow-wrap:anywhere` en contenedores adyacentes.

### `app-select`
- **Riesgo:** labels de opción muy largas en selección activa.
- **Estrategia activa:**
  - Mostrar texto completo en el DOM (sin mutar valor).
  - Usar truncado visual únicamente en la caja visible.
  - Mantener mensajes de validación reales (ej. `required`) con texto explícito.
- **Recomendación con contenido extremo:** priorizar `title`/tooltip y accesibilidad (`aria-label`) para mantener trazabilidad del valor original.

## Componentes compuestos

### `app-select-search-ui`
- **Riesgo:** resultados con labels/descripciones largas y errores de red.
- **Estrategia activa:**
  - Wrap seguro con `break-words` + `overflow-wrap:anywhere`.
  - No truncar destructivamente resultados.
  - Mostrar errores reales del backend en estado visible (`error`).
- **Recomendación con contenido extremo:** limitar tamaño de lote de resultados y usar búsqueda incremental para evitar paneles demasiado altos o densos.

## Checklist de verificación por breakpoint
- **Mobile (<640px):** confirmar wrap y ausencia de overflow horizontal.
- **Tablet/Desktop (≥640px):** confirmar ellipsis sólo cuando ayuda a compactar el layout.
- **Todos:** validar que el texto completo siga disponible por `title`, tooltip o copia íntegra en estado interno.
