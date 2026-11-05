# Componentes Modales - Sistema OAuth

## Descripción General

Esta carpeta contiene una colección completa de componentes modales reutilizables diseñados para el sistema OAuth. Todos los componentes utilizan los estilos institucionales y siguen las mejores prácticas de Angular.

## Componentes Disponibles

### 1. Modal de Confirmación (`confirmation-modal.component.ts`)
**Propósito:** Confirmar acciones críticas o destructivas
- ✅ Soporte para tipos: info, warning, danger, success
- ✅ Iconos automáticos según el tipo
- ✅ Prevención de cierre accidental
- ✅ Estilos institucionales

**Uso típico:** Eliminar registros, cerrar sin guardar, acciones irreversibles

### 2. Modal de Alerta (`alert-modal.component.ts`)
**Propósito:** Mostrar información importante al usuario
- ✅ Auto-cierre configurable con temporizador
- ✅ Barra de progreso para auto-cierre
- ✅ Múltiples tipos: success, info, warning, error
- ✅ Acciones personalizables

**Uso típico:** Mensajes de éxito, errores, notificaciones

### 3. Modal de Carga (`loading-modal.component.ts`)
**Propósito:** Indicar progreso de operaciones largas
- ✅ Spinner institucional animado
- ✅ Barra de progreso configurable
- ✅ Botón de cancelación opcional
- ✅ Mensajes dinámicos

**Uso típico:** Subir archivos, procesar datos, exportar reportes

### 4. Modal de Galería (`gallery-modal.component.ts`)
**Propósito:** Mostrar imágenes en pantalla completa
- ✅ Navegación entre imágenes (anterior/siguiente)
- ✅ Thumbnails para navegación rápida
- ✅ Soporte para títulos y descripciones
- ✅ Controles de teclado (flechas, ESC)

**Uso típico:** Galerías de fotos, visualizador de documentos

### 5. Modal de Selección (`selection-modal.component.ts`)
**Propósito:** Seleccionar elementos de una lista
- ✅ Selección simple y múltiple
- ✅ Búsqueda y filtrado integrado
- ✅ Seleccionar/deseleccionar todo
- ✅ Límites de selección configurables
- ✅ Iconos y descripciones por opción

**Uso típico:** Elegir usuarios, categorías, opciones múltiples

### 6. Modal Drawer (`drawer-modal.component.ts`)
**Propósito:** Panel lateral para navegación o detalles
- ✅ Posicionamiento: left, right, top, bottom
- ✅ Tamaños configurables: sm, md, lg
- ✅ Slots para header, contenido y footer
- ✅ Animaciones suaves de entrada/salida

**Uso típico:** Menús de navegación, paneles de propiedades

### 7. Modal Fullscreen (`fullscreen-modal.component.ts`)
**Propósito:** Contenido que requiere toda la pantalla
- ✅ Ocupa todo el viewport
- ✅ Header opcional con acciones personalizables
- ✅ Footer opcional para botones de acción
- ✅ Perfecto para editores y visualizadores

**Uso típico:** Editores, visualizadores, dashboards complejos

### 8. Modal con Tabs (`tab-modal.component.ts`)
**Propósito:** Organizar contenido en pestañas
- ✅ Posición de tabs: top, left, right, bottom
- ✅ Badges y contadores en tabs
- ✅ Navegación por teclado
- ✅ Contenido dinámico por tab

**Uso típico:** Configuraciones, formularios complejos

### 9. Modal de Configuraciones (`settings-modal.component.ts`)
**Propósito:** Paneles de configuración complejos
- ✅ Navegación lateral por secciones
- ✅ Búsqueda de configuraciones
- ✅ Acciones: guardar, cancelar, resetear
- ✅ Interfaz tipo panel de control

**Uso típico:** Preferencias de usuario, configuración del sistema

### 10. Demo de Modales (`demo-modales.component.ts`)
**Propósito:** Página de demostración y documentación
- ✅ Ejemplos interactivos de todos los modales
- ✅ Configuraciones diferentes por modal
- ✅ Resultados de acciones mostrados
- ✅ Navegación entre demos

## Características Comunes

### 🎨 Estilos Institucionales
- Colores: `--institucional-primario`, `--institucional-secundario`, `--institucional-terciario`
- Tipografía consistente
- Sombras y bordes institucionales

### 🌟 Animaciones CSS Global
- `animate-modal-backdrop`: Fade in/out del backdrop
- `animate-modal-content`: Slide/scale del contenido
- `animate-fade-in`: Aparición suave
- Transiciones fluidas y profesionales

### ♿ Accesibilidad
- Navegación por teclado (Tab, Enter, ESC)
- ARIA labels y roles apropiados
- Focus trap automático
- Contraste de colores adecuado

### 📱 Responsive Design
- Adaptación automática a móviles y tablets
- Breakpoints Tailwind CSS
- Touch-friendly en dispositivos móviles

## Estructura de Archivos

```
modals/
├── confirmation-modal.component.ts    # Modal de confirmación
├── alert-modal.component.ts          # Modal de alertas
├── loading-modal.component.ts        # Modal de carga
├── gallery-modal.component.ts        # Modal de galería
├── selection-modal.component.ts      # Modal de selección
├── drawer-modal.component.ts         # Modal drawer
├── fullscreen-modal.component.ts     # Modal fullscreen
├── tab-modal.component.ts           # Modal con tabs
├── settings-modal.component.ts       # Modal de configuraciones
├── demo-modales.component.ts         # Demo interactivo
├── index.ts                          # Barrel exports
└── README.md                         # Esta documentación
```

## Instalación y Uso

### 1. Importar Componentes
```typescript
// Importar componentes específicos
import { 
  ConfirmationModalComponent, 
  AlertModalComponent,
  LoadingModalComponent 
} from './shared/components/modals';

// O importar desde el index
import { 
  ConfirmationModalComponent,
  MODAL_TYPES,
  CONFIRMATION_TYPES 
} from './shared/components/modals';
```

### 2. Agregar a Componente
```typescript
@Component({
  imports: [ConfirmationModalComponent],
  template: `
    <app-confirmation-modal
      [isOpen]="showConfirmation"
      [config]="confirmConfig"
      (confirm)="onConfirm()"
      (cancel)="onCancel()"
      (modalClose)="showConfirmation = false">
    </app-confirmation-modal>
  `
})
```

### 3. Configurar Modal
```typescript
confirmConfig: ConfirmationConfig = {
  title: 'Eliminar Usuario',
  message: '¿Estás seguro de que deseas eliminar este usuario?',
  type: 'danger',
  confirmText: 'Eliminar',
  preventClose: true
};
```

## Navegación entre Demos

- **Demo de Formularios:** `/demo-formularios`
- **Demo de Modales:** `/demo-modales`

### Navegación desde código
```typescript
// Ir al demo de modales
this.router.navigate(['/demo-modales']);

// Ir al demo de formularios
this.router.navigate(['/demo-formularios']);
```

## Dependencias

### CSS Global Requerido
- Variables CSS institucionales (`--institucional-*`)
- Animaciones de modal (`animate-modal-*`)
- Tailwind CSS para utilidades

### Angular Dependencies
- `@angular/common` (CommonModule)
- `@angular/forms` (ReactiveFormsModule)
- `@angular/router` (para navegación)

### Iconos
- Material Symbols (Google Icons)
- Configurados en `index.html`

## Personalización

### Colores Institucionales
Modifica las variables CSS en `styles.css`:
```css
:root {
  --institucional-primario: #722F37;
  --institucional-secundario: #C4A484;
  --institucional-terciario: #8B1538;
}
```

### Animaciones
Personaliza las animaciones en `styles.css`:
```css
.animate-modal-backdrop {
  animation: fadeIn 0.3s ease-out;
}

.animate-modal-content {
  animation: slideIn 0.3s ease-out;
}
```

## Testing

Para probar los componentes:

1. **Acceder al Demo:**
   - Navegar a `/demo-modales`
   - Probar todos los tipos de modal
   - Verificar responsive design

2. **Navegación:**
   - Usar botones de navegación entre demos
   - Verificar rutas funcionando

3. **Funcionalidad:**
   - Probar todos los botones y acciones
   - Verificar resultados en sección de resultados
   - Comprobar animaciones y transiciones

## Soporte

Para dudas o mejoras:
- Revisar código fuente en cada componente
- Usar el demo interactivo como referencia
- Consultar interfaces TypeScript para configuraciones

## Próximas Mejoras

- [ ] Servicio global de modales
- [ ] Themes adicionales
- [ ] Más tipos de animación
- [ ] Componentes de modal especializados
- [ ] Tests unitarios automáticos
