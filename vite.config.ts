import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Plugin para excluir archivos binarios de face-api.js del análisis de Vite
 * y servirlos directamente como archivos estáticos
 */
function excludeBinaryFiles(): Plugin {
  return {
    name: 'exclude-binary-files',
    enforce: 'pre',
    // Interceptar durante la resolución para evitar que Vite intente procesar estos archivos
    resolveId(id) {
      // Si es un archivo binario de modelos, marcarlo como externo para que Vite no lo procese
      if (
        id.includes('face-api-models') &&
        (id.endsWith('-shard1') || id.endsWith('-shard2') || id.endsWith('-shard3'))
      ) {
        // Retornar el ID marcado como externo evita que Vite intente analizarlo
        return { id, external: true };
      }
      return null;
    },
    // Interceptar durante la carga para evitar el análisis
    load(id) {
      if (
        id.includes('face-api-models') &&
        (id.endsWith('-shard1') || id.endsWith('-shard2') || id.endsWith('-shard3'))
      ) {
        // Retornar null hace que Vite lo trate como asset estático sin análisis
        return null;
      }
      return null;
    },
    // Interceptar durante la transformación como respaldo
    transform(_code, id) {
      // Si es un archivo binario de modelos, retornar null para que Vite lo trate como asset estático
      // Interceptar tanto imports de módulos como archivos desde publicDir
      if (
        id.includes('face-api-models') &&
        (id.endsWith('-shard1') || id.endsWith('-shard2') || id.endsWith('-shard3'))
      ) {
        // Retornar null hace que Vite lo trate como asset estático sin análisis
        return null;
      }
      // También interceptar archivos desde publicDir usando el path completo
      if (
        id.includes('/public/assets/face-api-models/') ||
        id.includes('\\public\\assets\\face-api-models\\')
      ) {
        const fileName = id.split(/[/\\]/).pop() || '';
        if (
          fileName.endsWith('-shard1') ||
          fileName.endsWith('-shard2') ||
          fileName.endsWith('-shard3')
        ) {
          // Retornar null para evitar análisis
          return null;
        }
      }
      return null;
    },
    configureServer(server) {
      // Retornar una función que se ejecuta después de la configuración inicial
      // Esto asegura que el middleware se ejecute en el orden correcto
      return () => {
        // Crear el middleware que intercepta archivos binarios
        const handleBinaryFiles = (
          req: { url?: string },
          res: {
            writeHead: (status: number, headers: Record<string, string>) => void;
            end: (content: Buffer) => void;
          },
          next: () => void,
        ) => {
          const url = req.url || '';

          // Interceptar solicitudes a archivos binarios de face-api-models
          // Interceptar tanto /face-api-models como /assets/face-api-models
          if (url.includes('/face-api-models/') || url.includes('/assets/face-api-models/')) {
            const fileName = url.split('/').pop() || '';

            // Verificar si es un archivo binario o JSON
            if (
              fileName.endsWith('-shard1') ||
              fileName.endsWith('-shard2') ||
              fileName.endsWith('-shard3') ||
              fileName.endsWith('.json')
            ) {
              // Normalizar el nombre del archivo: reemplazar espacios con guiones bajos
              const normalizedFileName = fileName.replace(/\s+/g, '_');

              try {
                // Los archivos binarios están en .face-api-models/ (en la raíz del proyecto)
                // Los JSON están en public/assets/face-api-models/
                let filePath: string;
                if (normalizedFileName.endsWith('.json')) {
                  filePath = join(
                    process.cwd(),
                    'public',
                    'assets',
                    'face-api-models',
                    normalizedFileName,
                  );
                } else {
                  // Archivos binarios en la raíz del proyecto: .face-api-models/
                  filePath = join(process.cwd(), '.face-api-models', normalizedFileName);
                }

                if (existsSync(filePath)) {
                  const stats = statSync(filePath);
                  const fileContent = readFileSync(filePath);

                  // Determinar el Content-Type según la extensión
                  let contentType = 'application/octet-stream';
                  if (normalizedFileName.endsWith('.json')) {
                    contentType = 'application/json';
                  }

                  res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': stats.size.toString(),
                    'Cache-Control': 'public, max-age=31536000',
                  });
                  res.end(fileContent);
                  return;
                } else {
                  console.warn(`[vite-plugin] ❌ Archivo no encontrado: ${filePath}`);
                  // Listar archivos disponibles para debugging
                  try {
                    const dirPath = normalizedFileName.endsWith('.json')
                      ? join(process.cwd(), 'public', 'assets', 'face-api-models')
                      : join(process.cwd(), '.face-api-models');
                    const availableFiles = readdirSync(dirPath);
                    console.warn(
                      `[vite-plugin] Archivos disponibles en ${dirPath}: ${availableFiles.join(', ')}`,
                    );
                  } catch (e) {
                    console.error('[vite-plugin] Error al listar archivos:', e);
                  }
                }
              } catch (error) {
                console.error('[vite-plugin] ❌ Error al servir archivo:', error);
              }
            }
          }
          next();
        };

        // Insertar el middleware al PRINCIPIO de la pila
        const stack = server.middlewares.stack;
        server.middlewares.stack = [];
        server.middlewares.use(handleBinaryFiles);
        // Restaurar los middlewares originales después
        stack.forEach((layer: (typeof stack)[0]) => {
          server.middlewares.stack.push(layer);
        });
      };
    },
  };
}

/**
 * Configuración de Vite para excluir archivos binarios del análisis de imports
 * Esto evita que Vite intente parsear archivos binarios como JavaScript
 */
export default defineConfig({
  optimizeDeps: {
    exclude: ['face-api.js'],
  },
  server: {
    fs: {
      // Permitir servir archivos desde public
      allow: ['..'],
      strict: false,
    },
  },
  plugins: [excludeBinaryFiles()],
  // Configurar publicDir para que Vite sirva los archivos estáticos correctamente
  publicDir: 'public',
});
