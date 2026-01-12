import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = path.join(__dirname, '..', '.env');
const envDevPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
const envProdPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

// Leer variables de entorno desde .env si existe
const envVars = {};
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value.trim();
      }
    }
  });
}

// Generar contenido de environment.ts
const generateEnvironmentContent = (isProd) => {
  const apiUrl = envVars.API_URL || (isProd ? 'https://api.example.com/api' : envVars.apiUrl);

  return `export const environment = {
  production: ${isProd},
  apiUrl: '${apiUrl}'
};
`;
};

// Escribir archivos
fs.writeFileSync(envDevPath, generateEnvironmentContent(false));
fs.writeFileSync(envProdPath, generateEnvironmentContent(true));

console.log('✅ Archivos de entorno generados correctamente');
