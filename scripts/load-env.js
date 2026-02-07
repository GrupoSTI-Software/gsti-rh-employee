import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = path.join(__dirname, '..', '.env');
const envDevPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
const envProdPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
const swPath = path.join(__dirname, '..', 'src', 'assets', 'firebase-messaging-sw.js');

/**
 * Convierte una cadena de camelCase o cualquier formato a UPPER_SNAKE_CASE.
 *
 * @param {string} str - Cadena en cualquier formato
 * @returns {string} Cadena en formato UPPER_SNAKE_CASE
 */
const toUpperSnakeCase = (str) => {
  return str
    // Insertar guion bajo antes de mayúsculas (para camelCase)
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    // Convertir todo a mayúsculas
    .toUpperCase();
};

/**
 * Detecta y convierte el tipo de valor apropiado.
 *
 * @param {string} value - Valor en formato string
 * @returns {{ value: unknown, isString: boolean }} Objeto con el valor convertido y si es string
 */
const parseValue = (value) => {
  // Booleanos
  if (value.toLowerCase() === 'true') {
    return { value: true, isString: false };
  }
  if (value.toLowerCase() === 'false') {
    return { value: false, isString: false };
  }

  // Números
  if (!isNaN(value) && value !== '') {
    const num = Number(value);
    if (!isNaN(num)) {
      return { value: num, isString: false };
    }
  }

  // String por defecto
  return { value, isString: true };
};

/**
 * Lee las variables del archivo .env y las retorna como un objeto.
 * Convierte los nombres de las variables a UPPER_SNAKE_CASE.
 *
 * @returns {Record<string, { value: unknown, isString: boolean }>} Objeto con las variables de entorno
 */
const readEnvFile = () => {
  const envVars = {};

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const rawValue = valueParts.join('=').replace(/^["']|["']$/g, '').trim();
          // Convertir el nombre de la variable a UPPER_SNAKE_CASE
          const upperKey = toUpperSnakeCase(key.trim());
          envVars[upperKey] = parseValue(rawValue);
        }
      }
    });
  }

  return envVars;
};

/**
 * Formatea un valor para ser escrito en el archivo TypeScript.
 *
 * @param {{ value: unknown, isString: boolean }} parsedValue - Valor parseado
 * @returns {string} Valor formateado para TypeScript
 */
const formatValue = (parsedValue) => {
  if (parsedValue.isString) {
    return `'${parsedValue.value}'`;
  }
  return String(parsedValue.value);
};

/**
 * Genera el contenido del archivo environment.ts basado en las variables del .env.
 * Las variables se mantienen en UPPER_SNAKE_CASE.
 *
 * @param {Record<string, { value: unknown, isString: boolean }>} envVars - Variables de entorno
 * @returns {string} Contenido del archivo environment.ts
 */
const generateEnvironmentContent = (envVars) => {
  const entries = Object.entries(envVars);

  // Construir las propiedades del objeto environment
  const properties = entries.map(([key, parsedValue]) => {
    return `  ${key}: ${formatValue(parsedValue)}`;
  });

  return `export const environment = {
${properties.join(',\n')}
};
`;
};

const injectEnvIntoServiceWorker = (envVars) => {
  if (!fs.existsSync(swPath)) return;

  let content = fs.readFileSync(swPath, 'utf-8');

  const requiredKeys = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
  ];

  requiredKeys.forEach((key) => {
    if (!envVars[key]) {
      console.warn(`⚠️  ${key} no está definido en .env`);
      return;
    }

    const value = envVars[key].value;
    content = content.replaceAll(`__${key}__`, value);
  });

  fs.writeFileSync(swPath, content);
  console.log('🔥 firebase-messaging-sw.js actualizado con variables de entorno');
};

// Leer variables de entorno desde .env
const envVars = readEnvFile();

// Validar que exista la variable PRODUCTION
if (!envVars.PRODUCTION) {
  console.warn('⚠️  Advertencia: No se encontró la variable PRODUCTION en el archivo .env');
  console.warn('   Se agregará PRODUCTION: false por defecto');
  envVars.PRODUCTION = { value: false, isString: false };
}

// Escribir archivos
fs.writeFileSync(envDevPath, generateEnvironmentContent(envVars));
fs.writeFileSync(envProdPath, generateEnvironmentContent(envVars));
injectEnvIntoServiceWorker(envVars);
console.log('✅ Archivos de entorno generados correctamente');
console.log(`   📄 ${envDevPath}`);
console.log(`   📄 ${envProdPath}`);
console.log(`   📋 Variables cargadas: ${Object.keys(envVars).join(', ') || 'ninguna'}`);
