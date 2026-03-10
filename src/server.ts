import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Middleware de seguridad - Headers de seguridad HTTP
 * Protege contra XSS, clickjacking, MIME sniffing, etc.
 */
app.use((_req, res, next) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevenir MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Habilitar protección XSS del navegador (legacy, pero útil para navegadores antiguos)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Política de referrer para proteger información sensible
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Política de permisos - restringir APIs sensibles
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(self), payment=()',
  );

  // Content Security Policy - restringir fuentes de contenido
  // Nota: Ajustar según las necesidades de la aplicación
  const isDevelopment = process.env['NODE_ENV'] !== 'production';
  const connectSrc = isDevelopment
    ? "'self' https: http: ws: wss: ws://127.0.0.1:* ws://localhost:*" // Permitir WebSockets en desarrollo
    : "'self' https: http:"; // Solo HTTPS/HTTP en producción

  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Necesario para Angular
      "style-src 'self' 'unsafe-inline'", // Necesario para estilos dinámicos
      "img-src 'self' data: https: http: blob:", // Permitir imágenes de APIs externas
      "font-src 'self' data:", // Fuentes locales
      `connect-src ${connectSrc}`, // APIs externas y WebSockets en desarrollo
      "frame-src 'self' https://*.digitaloceanspaces.com", // Permitir iframes de DigitalOcean Spaces (PDFs)
      "frame-ancestors 'none'", // Prevenir embedding
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // Habilitar HSTS en producción (solo funciona con HTTPS)
  if (process.env['NODE_ENV'] === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

/**
 * Middleware para scripts de Service Worker.
 *
 * Los SW scripts son el ÚNICO punto que bypasea el SW activo por especificación:
 * el navegador los fetcha directamente al servidor para comprobar actualizaciones,
 * sin que el SW instalado pueda interceptarlos.
 *
 * Cache-Control: no-cache (sin no-store) permite al navegador usar ETags para
 * revalidación condicional, reduciendo el ancho de banda. El navegador siempre
 * consulta al servidor pero obtiene 304 si el archivo no cambió.
 *
 * Clear-Site-Data: TEMPORAL para migración desde app anterior en el mismo dominio.
 * Se envía solo durante el período de migración definido por SW_MIGRATION_DEADLINE.
 * Una vez vencida la fecha, eliminar esta constante y el bloque condicional.
 * ⚠️  Extender la fecha si aún hay usuarios con la app anterior instalada.
 */

// Fecha límite del período de migración. Después de esta fecha no se envía
// Clear-Site-Data y el caché de la PWA funciona con normalidad.
// TODO: Eliminar esta constante y el bloque condicional tras la migración completa.
const SW_MIGRATION_DEADLINE = new Date('2026-05-15T00:00:00Z');

app.get(['/ngsw-worker.js', '/offline-sw.js'], (_req, res, next) => {
  // no-cache permite ETags (304 condicional); no-store los inhabilitaría.
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Solo limpiar cachés durante el período de migración.
  // Fuera de ese período la PWA cachea con normalidad.
  if (new Date() < SW_MIGRATION_DEADLINE) {
    res.setHeader('Clear-Site-Data', '"cache"');
  }

  next();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id'] !== undefined) {
  const port = process.env['PORT'] ?? '4000';
  app.listen(Number.parseInt(port, 10), (error) => {
    if (error) {
      throw error;
    }

    // eslint-disable-next-line no-console
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
