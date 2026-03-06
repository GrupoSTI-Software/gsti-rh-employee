# NoConnectionOverlayComponent

Componente de overlay que se muestra cuando no hay conexión a internet.

## Uso

Este componente se integra automáticamente en el componente principal de la aplicación y no requiere configuración adicional.

```html
<app-no-connection-overlay></app-no-connection-overlay>
```

## Características

- ✅ Detección automática de pérdida de conexión
- ✅ Botón de reintentar con estado de carga
- ✅ Animaciones suaves
- ✅ Diseño responsivo
- ✅ Soporte para modo claro y oscuro
- ✅ Traducciones en español e inglés
- ✅ Accesibilidad completa

## Dependencias

- `ConnectionService`: Servicio que monitorea el estado de la conexión
- `TranslateModule`: Para traducciones

## Signals

- `isRetrying`: Indica si se está reintentando la conexión
- `isOnline`: Estado de conexión (del servicio)
- `showOverlay`: Indica si se debe mostrar el overlay (del servicio)

## Métodos

### `retry()`

Intenta reconectar verificando la conexión con el servidor.

```typescript
protected async retry(): Promise<void>
```

## Estilos

Los estilos utilizan:
- Variables SCSS del sistema de diseño
- Mixins existentes
- Variables CSS para temas
- Animaciones CSS personalizadas

## Animaciones

- `fadeIn`: Aparición del overlay
- `slideUp`: Deslizamiento del contenido
- `pulse`: Pulsación del icono
- `spin`: Rotación del spinner de carga
