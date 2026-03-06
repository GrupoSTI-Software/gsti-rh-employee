import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = path.join(__dirname, '..', '.env');
const envExampleFile = path.join(__dirname, '..', '.env.example');

/**
 * Verifica que el archivo .env exista. Si no existe, intenta crearlo
 * desde .env.example o desde variables de entorno del sistema.
 */
const ensureEnvFile = () => {
  console.log('🔍 Verificando archivo .env...');

  // Si el .env existe, no hacer nada
  if (fs.existsSync(envFile)) {
    const stats = fs.statSync(envFile);
    console.log('✅ Archivo .env encontrado');
    console.log(`   Tamaño: ${stats.size} bytes`);
    console.log(`   Última modificación: ${stats.mtime.toISOString()}`);
    return;
  }

  console.warn('⚠️  Archivo .env no encontrado');

  // Intentar copiar desde .env.example
  if (fs.existsSync(envExampleFile)) {
    console.log('📋 Copiando desde .env.example...');
    fs.copyFileSync(envExampleFile, envFile);
    console.log('✅ Archivo .env creado desde .env.example');
    console.warn('⚠️  IMPORTANTE: Debes configurar las variables en .env con los valores correctos');
    return;
  }

  // Si no existe .env.example, crear un .env vacío con comentario
  console.warn('⚠️  No se encontró .env.example');
  console.log('📝 Creando .env vacío...');
  
  const defaultContent = `# Archivo .env generado automáticamente
# Por favor, configura las variables de entorno necesarias para tu aplicación

# Ejemplo:
# PRODUCTION=false
# API_BASE_URL=https://api.example.com
`;

  fs.writeFileSync(envFile, defaultContent);
  console.log('✅ Archivo .env creado');
  console.warn('⚠️  IMPORTANTE: Debes agregar las variables de entorno necesarias en .env');
};

try {
  ensureEnvFile();
} catch (error) {
  console.error('❌ Error al verificar/crear archivo .env:', error);
  process.exit(1);
}
