# Tokens permitidos (guía corta)

Usa **solo tokens** para valores críticos en componentes base (`buttons`, `modals`, `inputs`, `tables`).

## 1) Spacing
- Permitidos: `var(--space-*)`, `var(--spacing-*)`.
- Ejemplos: `var(--space-8)`, `var(--space-16)`, `var(--spacing-inline-md)`.
- Evitar: `padding: 12px`, `margin: 1rem` hardcodeado.

## 2) Focus ring
- Permitidos: `var(--focus-ring-*)` y `var(--focus-ring-shadow-*)`.
- Ejemplo recomendado: `box-shadow: var(--focus-ring-shadow-primary)`.
- Evitar: `box-shadow: 0 0 0 3px rgba(...)` hardcodeado.

## 3) Z-index
- Permitidos: `var(--z-*)`.
- Ejemplos: `var(--z-overlay)`, `var(--z-modal)`, `var(--z-popover)`.
- Evitar: `z-index: 9999` literal.

## 4) Tamaños interactivos
- Permitidos: `var(--interactive-size-*)`.
- Ejemplos: `var(--interactive-size-xs)` a `var(--interactive-size-xl)`.
- Evitar: `min-height: 2.5rem` o `width: 3rem` hardcodeado.
