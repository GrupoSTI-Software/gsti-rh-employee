# PWA Update Overlay Component

Componente overlay que notifica al usuario cuando hay una nueva versión de la aplicación disponible.

## Funcionalidad

- Detecta automáticamente cuando hay una nueva versión del Service Worker lista para activar
- Muestra un overlay modal con dos opciones:
  - **Actualizar Ahora**: Activa la nueva versión y recarga la aplicación
  - **Más Tarde**: Cierra el aviso (la actualización se aplicará en la próxima recarga manual)
- Verifica actualizaciones cada 30 minutos en segundo plano
- Utiliza `ChangeDetectionStrategy.OnPush` para optimizar el rendimiento

## Uso

El componente ya está integrado en `app.html` y se muestra automáticamente cuando hay una actualización disponible:

```html
<app-pwa-update-overlay></app-pwa-update-overlay>
```

## Dependencias

- `PwaUpdateService`: Servicio que gestiona la lógica de detección y aplicación de actualizaciones
- `@angular/service-worker`: Módulo de Angular que proporciona `SwUpdate`
- `TranslateModule`: Para las traducciones de los textos

## Traducciones

Las traducciones están en `src/assets/i18n/`:

```json
"update": {
  "title": "Nueva Versión Disponible",
  "message": "Hay una actualización lista para instalar...",
  "apply": "Actualizar Ahora",
  "later": "Más Tarde"
}
```

## Control de versión

La versión de la aplicación se gestiona en `package.json`. El Service Worker de Angular detecta automáticamente cambios en el código compilado mediante el hash del build en `ngsw.json`.

**Importante**: Incrementa la versión en `package.json` antes de cada deploy para mantener un registro claro de las versiones.

## Flujo de actualización

1. Usuario tiene la PWA instalada con versión 1.0.0
2. Se despliega nueva versión 1.0.1 en el servidor
3. Service Worker detecta el nuevo `ngsw.json` con hash diferente
4. Descarga la nueva versión en segundo plano
5. Cuando está lista, el overlay aparece automáticamente
6. Usuario acepta → `activateUpdate()` + `reload()`
7. La app se recarga con la nueva versión

## Notas técnicas

- Solo funciona en builds de producción (el SW está deshabilitado en desarrollo)
- El Service Worker se registra con estrategia `registerImmediately` en `app.config.ts`
- La configuración del SW está en `ngsw-config.json`
