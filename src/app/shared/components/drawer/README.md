# Componente Drawer Reutilizable

Componente genérico para crear drawers (paneles deslizantes desde la parte inferior) con animaciones, swipe y configuración flexible.

## Características

- ✅ Animaciones independientes para overlay (fade) y contenedor (slide)
- ✅ Swipe hacia abajo para cerrar
- ✅ Click en overlay para cerrar (configurable)
- ✅ Header personalizable con título y botón de cancelar
- ✅ Contenido proyectado mediante `<ng-content>`
- ✅ Accesibilidad (ARIA labels, escape key)
- ✅ Estilos globales compartidos

## Uso Básico

```typescript
import { DrawerComponent } from '@shared/components/drawer/drawer.component';

@Component({
  imports: [DrawerComponent],
  // ...
})
export class MiComponente {
  showDrawer = false;

  openDrawer(): void {
    this.showDrawer = true;
  }

  closeDrawer(): void {
    this.showDrawer = false;
  }
}
```

```html
<app-drawer
  [(visible)]="showDrawer"
  [title]="'Mi Título'"
  [cancelButtonText]="'Cerrar'"
  (closed)="closeDrawer()"
>
  <!-- Tu contenido aquí -->
  <div class="mi-contenido">
    <p>Contenido del drawer</p>
  </div>
</app-drawer>
```

## Propiedades de Entrada (@Input)

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `visible` | `boolean` | `false` | Controla la visibilidad del drawer |
| `title` | `string` | `''` | Título que se muestra en el header |
| `showHeader` | `boolean` | `true` | Muestra u oculta el header completo |
| `showCancelButton` | `boolean` | `true` | Muestra u oculta el botón de cancelar |
| `cancelButtonText` | `string` | `'Cancelar'` | Texto del botón de cancelar |
| `closeOnOverlayClick` | `boolean` | `true` | Permite cerrar al hacer click en el overlay |
| `enableSwipe` | `boolean` | `true` | Habilita el swipe hacia abajo para cerrar |
| `swipeThreshold` | `number` | `100` | Distancia en píxeles para activar el cierre por swipe |

## Eventos de Salida (@Output)

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `visibleChange` | `EventEmitter<boolean>` | Emite cuando cambia la visibilidad (two-way binding) |
| `closed` | `EventEmitter<void>` | Emite cuando el drawer se cierra |

## Ejemplos de Uso

### Drawer Simple

```html
<app-drawer [(visible)]="showSimple" [title]="'Información'">
  <p>Este es un drawer simple</p>
</app-drawer>
```

### Drawer sin Header

```html
<app-drawer [(visible)]="showNoHeader" [showHeader]="false">
  <div class="custom-header">
    <h3>Mi Header Personalizado</h3>
  </div>
  <p>Contenido del drawer</p>
</app-drawer>
```

### Drawer sin Swipe

```html
<app-drawer
  [(visible)]="showNoSwipe"
  [title]="'Formulario Importante'"
  [enableSwipe]="false"
  [closeOnOverlayClick]="false"
>
  <form>
    <!-- Formulario que no debe cerrarse accidentalmente -->
  </form>
</app-drawer>
```

### Drawer con Swipe Personalizado

```html
<app-drawer
  [(visible)]="showCustomSwipe"
  [title]="'Drawer Sensible'"
  [swipeThreshold]="50"
>
  <p>Se cierra con solo 50px de swipe</p>
</app-drawer>
```

## Estilos

Los estilos base del drawer están definidos globalmente en `src/styles/_drawer.scss` e incluyen:

- `.drawer-overlay`: Fondo oscuro con fade
- `.drawer-container`: Contenedor principal con slide y barra de swipe
- `.drawer-header`: Header con título y botón de cancelar
- `.drawer-content`: Contenedor del contenido proyectado

### Personalizar Estilos del Contenido

Puedes agregar estilos específicos en el componente que usa el drawer:

```scss
// mi-componente.component.scss
.mi-contenido {
  padding: 1rem;
  
  .item {
    margin-bottom: 0.5rem;
  }
}
```

## Implementaciones Existentes

Ejemplos de uso en el proyecto:

1. **DatePickerDrawerComponent**: Drawer con calendario
2. **ExceptionsDrawerComponent**: Drawer con lista de excepciones
3. **RecordsDrawerComponent**: Drawer con lista de registros

## Notas Técnicas

- El drawer usa animaciones de Angular (`@angular/animations`)
- El swipe se implementa con eventos touch nativos
- El indicador de swipe (barra superior) se crea con `::before` en CSS
- El contenido se proyecta usando `<ng-content>`
- Two-way binding disponible con `[(visible)]`
