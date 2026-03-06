# Validación Global de Conexión a Internet

## Descripción

Se ha implementado un sistema global de validación de conexión a internet que muestra un overlay cuando se detecta pérdida de conexión y permite al usuario reintentar la conexión.

## Componentes Implementados

### 1. ConnectionService (`src/app/core/services/connection.service.ts`)

Servicio que monitorea el estado de la conexión a internet en tiempo real.

**Características:**
- Utiliza signals de Angular para manejo reactivo del estado
- Escucha eventos nativos del navegador (`online` y `offline`)
- Proporciona método para verificar conexión mediante petición HTTP
- Actualiza automáticamente el estado de conexión

**Signals públicos:**
- `isOnline`: Indica si hay conexión a internet
- `showOverlay`: Indica si se debe mostrar el overlay

**Métodos públicos:**
- `checkConnection()`: Verifica la conexión haciendo una petición al servidor
- `hideOverlay()`: Oculta manualmente el overlay
- `displayOverlay()`: Muestra manualmente el overlay

### 2. NoConnectionOverlayComponent (`src/app/shared/components/no-connection-overlay/`)

Componente standalone que muestra el overlay cuando no hay conexión.

**Características:**
- Diseño responsivo y accesible
- Animaciones suaves de entrada/salida
- Botón de reintento con estado de carga
- Icono SVG personalizado de sin conexión
- Soporte para modo claro y oscuro
- Traducciones en español e inglés

**Estructura de archivos:**
```
no-connection-overlay/
├── no-connection-overlay.component.ts
├── no-connection-overlay.component.html
└── no-connection-overlay.component.scss
```

### 3. Traducciones

Se agregaron las siguientes claves de traducción en `src/assets/i18n/`:

**Español (es.json):**
```json
{
  "connection": {
    "noConnection": "Sin Conexión a Internet",
    "noConnectionMessage": "No se pudo establecer conexión con el servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.",
    "retry": "Reintentar",
    "retrying": "Reintentando...",
    "connectionRestored": "Conexión restaurada"
  }
}
```

**Inglés (en.json):**
```json
{
  "connection": {
    "noConnection": "No Internet Connection",
    "noConnectionMessage": "Could not establish connection with the server. Please check your internet connection and try again.",
    "retry": "Retry",
    "retrying": "Retrying...",
    "connectionRestored": "Connection restored"
  }
}
```

## Integración

El componente se integró en el componente principal de la aplicación (`app.ts` y `app.html`):

```typescript
// app.ts
import { ConnectionService } from '@core/services/connection.service';
import { NoConnectionOverlayComponent } from '@shared/components/no-connection-overlay/no-connection-overlay.component';

@Component({
  // ...
  imports: [RouterOutlet, PullToRefreshDirective, NoConnectionOverlayComponent],
})
export class App implements OnInit {
  private readonly connectionService = inject(ConnectionService);
  // ...
}
```

```html
<!-- app.html -->
<div appPullToRefresh class="app-container">
  <router-outlet></router-outlet>
  <app-no-connection-overlay></app-no-connection-overlay>
</div>
```

## Funcionamiento

1. **Detección automática**: El servicio escucha los eventos `online` y `offline` del navegador
2. **Verificación activa**: Al hacer clic en "Reintentar", se realiza una petición HTTP para verificar la conexión
3. **Feedback visual**: El overlay muestra un spinner mientras se reintenta la conexión
4. **Restauración automática**: Cuando se detecta conexión, el overlay se oculta automáticamente

## Estilos y Diseño

El overlay utiliza:
- Variables SCSS del sistema de diseño (`$spacing-*`, `$font-size-*`, `$radius-*`)
- Mixins existentes (`@include flex-center`, `@include button-primary`)
- Variables CSS para colores (`var(--bg-primary)`, `var(--text-primary)`, `var(--danger)`)
- Animaciones CSS personalizadas (fadeIn, slideUp, pulse, spin)
- Backdrop con blur effect
- Z-index apropiado (`$z-index-modal`)

## Accesibilidad

- El overlay incluye atributos ARIA apropiados
- El botón de reintentar es accesible por teclado
- Los estados de carga son anunciados correctamente
- El backdrop tiene `role="presentation"` y `tabindex="-1"`

## Buenas Prácticas Aplicadas

✅ Arquitectura hexagonal respetada (servicio en `core`, componente en `shared`)
✅ Uso de signals para manejo de estado reactivo
✅ Componente standalone
✅ Documentación JSDoc en español
✅ Sin uso de `console.log` (solo en bloques catch si fuera necesario)
✅ Código cumple con ESLint y Prettier
✅ Traducciones en español e inglés
✅ Uso de variables y mixins del sistema de diseño
✅ Archivos separados para template y estilos
✅ Principios SOLID aplicados

## Pruebas

Para probar la funcionalidad:

1. **Simular pérdida de conexión en DevTools:**
   - Abrir DevTools (F12)
   - Ir a la pestaña "Network"
   - Seleccionar "Offline" en el dropdown de throttling
   - El overlay debería aparecer automáticamente

2. **Probar el botón de reintentar:**
   - Con la conexión offline, hacer clic en "Reintentar"
   - Debería mostrar el estado "Reintentando..."
   - Restaurar la conexión (seleccionar "Online" en DevTools)
   - Hacer clic en "Reintentar" nuevamente
   - El overlay debería desaparecer

3. **Probar restauración automática:**
   - Poner la conexión offline
   - Esperar a que aparezca el overlay
   - Restaurar la conexión en DevTools
   - El overlay debería desaparecer automáticamente

## Notas Técnicas

- El servicio se inicializa automáticamente al ser `providedIn: 'root'`
- La verificación de conexión se hace contra un archivo estático (`/assets/i18n/es.json`) para evitar dependencias del backend
- Se usa un timestamp en la URL para evitar caché del navegador
- El componente es reactivo y responde inmediatamente a cambios de conexión
