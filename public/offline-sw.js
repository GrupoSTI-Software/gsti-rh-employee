/* global self, caches */

/**
 * Service Worker de transición. Reemplaza al offline-sw.js legacy en
 * todos los clientes que aún lo tienen registrado.
 *
 * Al activarse:
 *  1. Borra cachés con prefijo 'gsti-' generados por la versión anterior.
 *  2. Se auto-desregistra.
 *  3. Navega los clientes abiertos para que tomen la versión sin este SW.
 *
 * No intercepta fetch: no tiene listener 'fetch'. No puede afectar ninguna
 * petición de red. Es un SW de "suicidio".
 *
 * Ciclo de vida esperado:
 *  - Usuarios con el SW legacy registrado: el navegador actualiza el script
 *    (el update check nativo no pasa por caché del SW), activa esta versión,
 *    que se mata a sí misma. Próximo arranque de la PWA ya sin SW legacy.
 *  - Usuarios nuevos: nunca registran este SW (el registro desde index.html
 *    se eliminó en 1.0.0-rc8).
 *
 * Este archivo debe mantenerse durante 1-2 releases adicionales después de
 * 1.0.0-rc9 para asegurar propagación. Luego puede eliminarse del repo.
 */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      try {
        var keys = await caches.keys();
        await Promise.all(
          keys
            .filter(function (k) {
              return k.indexOf('gsti-') === 0;
            })
            .map(function (k) {
              return caches.delete(k);
            }),
        );
        await self.registration.unregister();
        var clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(function (c) {
          c.navigate(c.url);
        });
      } catch (e) {
        /* silencioso: si algo falla, que el watchdog del index.html se encargue */
      }
    })(),
  );
});
