/* global self, caches, fetch, Response, URL */

/**
 * Service Worker de soporte offline para la PWA.
 * Se encarga de cachear el shell de la aplicación (index.html y assets críticos)
 * para que la app pueda arrancar aunque no haya conexión a internet.
 *
 * También intercepta /manifest.webmanifest para servir el manifest dinámico
 * guardado por BrandingService, resolviendo el problema de Android donde Chrome
 * lee el manifest estático antes de que Angular cargue el dinámico.
 *
 * Este SW trabaja en paralelo con el ngsw-worker.js de Angular.
 */

var CACHE_NAME = 'gsti-offline-v1';
var DYNAMIC_MANIFEST_CACHE = 'gsti-dynamic-manifest-v1';
var MANIFEST_CACHE_KEY = '/manifest.webmanifest';

var SHELL_RESOURCES = [
  '/',
  '/index.html',
];

/**
 * Al instalar el SW, cachea inmediatamente el shell de la aplicación.
 * skipWaiting() hace que el nuevo SW tome control sin esperar.
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_RESOURCES);
    })
  );
  self.skipWaiting();
});

/**
 * Al activar, toma control de todos los clientes inmediatamente
 * y elimina cachés antiguas de versiones anteriores.
 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME && key !== DYNAMIC_MANIFEST_CACHE;
          })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/**
 * Recibe mensajes desde BrandingService para actualizar el manifest dinámico.
 * Cuando Angular carga el branding, envía el manifest actualizado al SW
 * para que lo sirva en futuras peticiones a /manifest.webmanifest.
 */
self.addEventListener('message', function (event) {
  if (!event.data) return;

  if (event.data.type === 'UPDATE_DYNAMIC_MANIFEST') {
    var manifestData = event.data.manifest;
    if (!manifestData) return;

    var manifestJson = JSON.stringify(manifestData);

    event.waitUntil(
      caches.open(DYNAMIC_MANIFEST_CACHE).then(function (cache) {
        return cache.put(
          MANIFEST_CACHE_KEY,
          new Response(manifestJson, {
            headers: {
              'Content-Type': 'application/manifest+json',
              'Cache-Control': 'no-cache',
            },
          })
        );
      })
    );
  }
});

/**
 * Intercepta peticiones fetch.
 *
 * Para /manifest.webmanifest:
 *   Sirve primero el manifest dinámico guardado por BrandingService.
 *   Si no existe aún, hace fetch de la red (manifest estático).
 *   Esto garantiza que Chrome lea siempre el manifest con nombre e ícono correctos.
 *
 * Para navegación HTML:
 *   Network First con fallback a caché (comportamiento offline).
 */
self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  // Interceptar peticiones al manifest para servir el dinámico
  if (url.pathname === MANIFEST_CACHE_KEY || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.open(DYNAMIC_MANIFEST_CACHE).then(function (cache) {
        return cache.match(MANIFEST_CACHE_KEY).then(function (cached) {
          if (cached) {
            // Servir el manifest dinámico guardado por BrandingService
            return cached.clone();
          }
          // Aún no hay manifest dinámico: usar el estático de la red
          return fetch(request).catch(function () {
            return new Response('{}', {
              headers: { 'Content-Type': 'application/manifest+json' },
            });
          });
        });
      })
    );
    return;
  }

  // Solo interceptar peticiones de navegación (GET de páginas HTML)
  if (request.mode !== 'navigate') return;

  // Dejar que el ngsw-worker.js maneje el resto
  event.respondWith(
    fetch(request)
      .then(function (response) {
        // Si la respuesta es válida, actualizar el caché con el index.html más reciente
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put('/index.html', responseClone);
          });
        }
        return response;
      })
      .catch(function () {
        // Sin conexión: servir el index.html desde caché
        return caches.match('/index.html').then(function (cached) {
          if (cached) return cached;
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexion</title></head><body></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
  );
});
