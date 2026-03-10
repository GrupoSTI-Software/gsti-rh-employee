/* global self, caches, fetch, Response */

/**
 * Service Worker de soporte offline para la PWA.
 * Se encarga de cachear el shell de la aplicación (index.html y assets críticos)
 * para que la app pueda arrancar aunque no haya conexión a internet.
 *
 * Este SW trabaja en paralelo con el ngsw-worker.js de Angular.
 * IMPORTANTE: Solo gestiona sus propios cachés (prefijo 'gsti-').
 * No debe interferir con los cachés del ngsw.
 */

var CACHE_NAME = 'gsti-offline-v1';

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
 * Al activar, toma control de todos los clientes inmediatamente y elimina:
 * - Cachés propios de versiones anteriores (prefijo 'gsti-' distinto al actual)
 * - Cualquier caché externo heredado de apps anteriores en el mismo dominio
 *   (ej. la app "SAE" que usaba este mismo dominio antes de esta app)
 * No toca los cachés de ngsw (prefijo 'ngsw:').
 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            // Eliminar cachés propios desactualizados
            var isOldGsti = key.startsWith('gsti-') && key !== CACHE_NAME;
            // Eliminar cachés de apps externas heredadas (no son de esta app ni de ngsw)
            var isExternal = !key.startsWith('gsti-') && !key.startsWith('ngsw:');
            return isOldGsti || isExternal;
          })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/**
 * Intercepta peticiones de navegación (HTML).
 * Estrategia: Network First con fallback a caché.
 * Las peticiones de assets se dejan al ngsw-worker.js.
 */
self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then(function (response) {
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put('/index.html', responseClone);
          });
        }
        return response;
      })
      .catch(function () {
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
