# Estilos Compartidos

Este directorio contiene variables y mixins SCSS reutilizables para mantener consistencia en toda la aplicación.

## Estructura

- `_variables.scss` - Variables SCSS para medidas, espaciados, tamaños de fuente, etc.
- `_mixins.scss` - Mixins reutilizables para componentes comunes
- `_index.scss` - Archivo índice que importa todas las utilidades

## Uso

### Importar en componentes

```scss
@use '../../../../styles/variables' as *;
@use '../../../../styles/mixins' as *;

// O importar todo de una vez usando el índice
@use '../../../../styles/index' as *;
```

### Variables disponibles

#### Espaciados
- `$spacing-xs` hasta `$spacing-4xl`
- Ejemplo: `padding: $spacing-lg;`

#### Border Radius
- `$radius-sm`, `$radius-md`, `$radius-lg`
- Ejemplo: `border-radius: $radius-md;`

#### Tamaños de fuente
- `$font-size-xs` hasta `$font-size-3xl`
- Ejemplo: `font-size: $font-size-base;`

#### Pesos de fuente
- `$font-weight-normal`, `$font-weight-medium`, `$font-weight-semibold`, `$font-weight-bold`

#### Transiciones
- `$transition-fast`, `$transition-base`, `$transition-slow`

### Mixins disponibles

#### Layout
- `@include flex-center` - Centrar contenido con flexbox
- `@include flex-between` - Espacio entre elementos
- `@include flex-column` - Columna flex

#### Formularios
- `@include input-base` - Estilos base para inputs
- `@include input-error` - Estado de error para inputs
- `@include form-group` - Grupo de formulario

#### Botones
- `@include button-base` - Estilos base para botones
- `@include button-primary` - Botón primario
- `@include button-secondary` - Botón secundario

#### Componentes
- `@include card` - Estilos de tarjeta
- `@include error-message` - Mensaje de error
- `@include error-alert` - Alerta de error

## Ejemplo de uso

```scss
@use '../../../../styles/variables' as *;
@use '../../../../styles/mixins' as *;

.my-component {
  @include card;
  padding: $spacing-3xl;
  
  .title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-semibold;
    margin-bottom: $spacing-lg;
  }
  
  .input {
    @include input-base;
    
    &.has-error {
      @include input-error;
    }
  }
  
  .button {
    @include button-primary;
  }
}
```

> **Nota:** Usamos `as *` para importar sin namespace, permitiendo usar las variables y mixins directamente. Si prefieres usar namespaces, puedes hacer `@use '../../../../styles/variables' as vars;` y luego usar `vars.$spacing-lg`.

## Variables CSS

Las variables CSS para colores y temas están definidas en `src/styles.scss` y se acceden con `var(--variable-name)`:

- `var(--bg-primary)`, `var(--bg-secondary)`, etc.
- `var(--text-primary)`, `var(--text-secondary)`, etc.
- `var(--primary)`, `var(--secondary)`, `var(--danger)`, etc.
- `var(--border-color)`, `var(--shadow-md)`, etc.

