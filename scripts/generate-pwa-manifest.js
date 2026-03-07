#!/usr/bin/env node
/**
 * Script de post-build: genera el manifest.webmanifest real con datos del branding.
 *
 * Problema que resuelve:
 * Android Chrome evalúa el manifest desde el archivo físico del servidor en el momento
 * de la instalación. El manifest dinámico que Angular inyecta en runtime (data: URL)
 * llega demasiado tarde: Chrome ya leyó el manifest estático antes de que Angular cargue.
 * Por eso Android muestra el nombre/icono genérico (GSTI) en lugar del branding real.
 *
 * Solución:
 * Este script se ejecuta después de `ng build` y:
 * 1. Hace fetch a la API de system-settings para obtener el branding real
 * 2. Escribe un manifest.webmanifest con los datos correctos en dist/
 * 3. Actualiza el index.html del dist para apuntar al manifest con cache-busting
 *
 * Uso: node scripts/generate-pwa-manifest.js
 * Se ejecuta automáticamente via "postbuild" en package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'gsti-pwa-empleado', 'browser');
const manifestOutputPath = path.join(distDir, 'manifest.webmanifest');
const envFile = path.join(rootDir, '.env');

/**
 * Busca recursivamente todos los archivos index.html e index.csr.html
 * dentro del directorio dist/browser.
 * Angular SSR pre-renderiza cada ruta como su propio index.html,
 * por lo que puede haber uno por cada ruta (ej: /pwa-required/index.html).
 * @param {string} dir - Directorio raíz donde buscar
 * @returns {string[]} Lista de rutas absolutas encontradas
 */
function findAllIndexHtmlFiles(dir) {
  const results = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllIndexHtmlFiles(fullPath));
    } else if (entry.isFile() && (entry.name === 'index.html' || entry.name === 'index.csr.html')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Lee la API_URL desde el archivo .env
 * @returns {string|null}
 */
function readApiUrlFromEnv() {
  if (!fs.existsSync(envFile)) {
    console.warn('⚠️  .env no encontrado, usando API_URL del entorno del sistema');
    return process.env.API_URL ?? null;
  }

  const content = fs.readFileSync(envFile, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    const key = trimmed.substring(0, eqIdx).trim();
    if (key !== 'API_URL') continue;
    let value = trimmed.substring(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value || null;
  }

  return process.env.API_URL ?? null;
}

/**
 * Hace fetch a la API para obtener el branding del sistema
 * @param {string} apiUrl
 * @returns {Promise<Object|null>}
 */
async function fetchSystemSettings(apiUrl) {
  if (!apiUrl || apiUrl === 'NOT ASSIGNED' || apiUrl.includes('localhost')) {
    console.warn(`⚠️  API_URL "${apiUrl}" no es válida para producción, se usará manifest genérico`);
    return null;
  }

  const endpoint = `${apiUrl}/system-settings-active`;
  console.log(`📡 Obteniendo branding desde: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`⚠️  API respondió con status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data?.data?.systemSetting) {
      console.log('✅ Branding obtenido correctamente');
      return data.data.systemSetting;
    }

    console.warn('⚠️  La respuesta no contiene systemSetting');
    return null;
  } catch (error) {
    console.warn(`⚠️  No se pudo obtener el branding: ${error.message}`);
    return null;
  }
}

/**
 * Construye el objeto manifest con los datos del branding
 * @param {Object|null} settings
 * @returns {Object}
 */
function buildManifest(settings) {
  const tradeName = settings?.systemSettingTradeName?.trim() || 'GSTI Empleado';
  const sidebarColor = settings?.systemSettingSidebarColor?.trim() || '093057';
  const themeColor = sidebarColor.startsWith('#') ? sidebarColor : `#${sidebarColor}`;

  // Prioridad de icono: icono de app empleado > favicon > fallback
  const iconUrl =
    settings?.systemSettingEmployeeAplicationIcon?.trim() ||
    settings?.systemSettingFavicon?.trim() ||
    '/assets/gsti/icon.png';

  // Logo para icono maskable (con fondo)
  const logoUrl = iconUrl || '/assets/gsti/adaptive-icon.png';

  const shortName = tradeName.length > 12 ? tradeName.substring(0, 12) : tradeName;

  return {
    name: tradeName,
    short_name: shortName,
    description: `Aplicación PWA para empleados de ${tradeName}`,
    theme_color: themeColor,
    background_color: '#ffffff',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    categories: ['business', 'productivity'],
    lang: 'es',
    prefer_related_applications: false,
    launch_handler: {
      client_mode: ['navigate-existing', 'auto'],
    },
    icons: [
      { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

/**
 * Escribe el manifest.webmanifest en el directorio dist/browser
 * @param {Object} manifest
 */
function writeManifest(manifest) {
  if (!fs.existsSync(distDir)) {
    console.warn(`⚠️  Directorio dist no encontrado: ${distDir}`);
    console.warn('   Asegúrate de ejecutar ng build antes de este script');
    return false;
  }

  fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✅ manifest.webmanifest escrito en: ${manifestOutputPath}`);
  console.log(`   - name: ${manifest.name}`);
  console.log(`   - short_name: ${manifest.short_name}`);
  console.log(`   - theme_color: ${manifest.theme_color}`);
  console.log(`   - icono: ${manifest.icons[0].src}`);
  return true;
}

/**
 * Aplica el branding y cache-busting del manifest a un único archivo HTML.
 * @param {string} filePath - Ruta absoluta al archivo HTML
 * @param {number} cacheBuster - Timestamp para cache-busting
 * @param {Object|null} settings - Datos del branding desde la API
 */
function patchHtmlFile(filePath, cacheBuster, settings) {
  let html = fs.readFileSync(filePath, 'utf8');

  // Reemplazar el link del manifest para agregar cache-busting
  html = html.replace(
    /<link\s+rel=["']manifest["']\s+href=["'][^"']*["']\s*\/?>/gi,
    `<link rel="manifest" href="/manifest.webmanifest?v=${cacheBuster}">`,
  );

  // Si no había link de manifest, insertarlo antes de </head>
  if (!html.includes('rel="manifest"') && !html.includes("rel='manifest'")) {
    html = html.replace(
      '</head>',
      `<link rel="manifest" href="/manifest.webmanifest?v=${cacheBuster}"></head>`,
    );
  }

  if (settings) {
    const tradeName = settings.systemSettingTradeName?.trim() || 'GSTI Empleado';
    const sidebarColor = settings.systemSettingSidebarColor?.trim() || '093057';
    const themeColor = sidebarColor.startsWith('#') ? sidebarColor : `#${sidebarColor}`;
    const iconUrl =
      settings.systemSettingEmployeeAplicationIcon?.trim() ||
      settings.systemSettingFavicon?.trim() ||
      '';

    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${tradeName}</title>`);

    html = html.replace(
      /<meta\s+name=["']theme-color["']\s+content=["'][^"']*["']\s*\/?>/gi,
      `<meta name="theme-color" content="${themeColor}">`,
    );

    html = html.replace(
      /<meta\s+name=["']apple-mobile-web-app-title["']\s+content=["'][^"']*["']\s*\/?>/gi,
      `<meta name="apple-mobile-web-app-title" content="${tradeName}">`,
    );

    html = html.replace(
      /<meta\s+name=["']application-name["']\s+content=["'][^"']*["']\s*\/?>/gi,
      `<meta name="application-name" content="${tradeName}">`,
    );

    if (iconUrl) {
      html = html.replace(
        /<link\s+rel=["']icon["'][^>]*>/gi,
        `<link rel="icon" href="${iconUrl}" type="image/png">`,
      );
    }
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

/**
 * Actualiza todos los archivos index HTML del dist con el branding real
 * y cache-busting del manifest.
 * Angular SSR pre-renderiza cada ruta como su propio index.html,
 * por lo que hay que actualizar todos (ej: /pwa-required/index.html).
 * @param {Object|null} settings
 */
function updateAllIndexHtmlFiles(settings) {
  const indexFiles = findAllIndexHtmlFiles(distDir);

  if (indexFiles.length === 0) {
    console.warn(`⚠️  No se encontraron archivos index HTML en: ${distDir}`);
    return;
  }

  // Usar el mismo cacheBuster para todos los archivos del mismo build
  const cacheBuster = Date.now();

  for (const filePath of indexFiles) {
    const relativePath = path.relative(distDir, filePath);
    try {
      patchHtmlFile(filePath, cacheBuster, settings);
      console.log(`✅ ${relativePath}`);
    } catch (error) {
      console.warn(`⚠️  No se pudo actualizar ${relativePath}: ${error.message}`);
    }
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('\n🚀 Generando manifest.webmanifest con branding real...\n');

  const apiUrl = readApiUrlFromEnv();
  if (apiUrl) {
    console.log(`📌 API_URL: ${apiUrl}`);
  } else {
    console.warn('⚠️  API_URL no configurada');
  }

  const settings = apiUrl ? await fetchSystemSettings(apiUrl) : null;
  const manifest = buildManifest(settings);

  const written = writeManifest(manifest);
  if (!written) {
    console.log('\n⚠️  El manifest no se escribió (dist no encontrado). Esto es normal en CI sin build previo.');
    process.exit(0);
  }

  console.log('\n📄 Actualizando archivos HTML del dist:');
  updateAllIndexHtmlFiles(settings);

  if (!settings) {
    console.log('\n⚠️  Se usó el manifest genérico (sin datos de la API).');
    console.log('   El BrandingService de Angular actualizará el manifest en runtime.');
  }

  console.log('\n✨ Post-build PWA completado!\n');
}

main().catch((error) => {
  console.error('❌ Error en generate-pwa-manifest:', error);
  // No fallar el build si el script de post-build falla
  process.exit(0);
});
