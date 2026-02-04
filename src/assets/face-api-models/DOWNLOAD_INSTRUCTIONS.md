# ⚠️ IMPORTANTE: Descargar los archivos binarios (shard1)

Los archivos JSON de manifiesto ya están creados, pero necesitas descargar los archivos binarios (`.shard1`) desde el repositorio de face-api.js.

## Pasos para completar la instalación

1. **Abre tu terminal en la raíz del proyecto**

2. **Navega al directorio de modelos:**
   ```bash
   cd src/assets/face-api-models
   ```

3. **Descarga los archivos binarios usando uno de estos métodos:**

   ### Método 1: Usando curl (recomendado)
   ```bash
   curl -L -k -o tiny_face_detector_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-shard1
   
   curl -L -k -o face_landmark_68_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-shard1
   
   curl -L -k -o face_recognition_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-shard1
   ```

   ### Método 2: Descargar manualmente desde el navegador
   
   Ve a estos enlaces y guarda los archivos en `src/assets/face-api-models/`:
   
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-shard1
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-shard1
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-shard1

   **Nota**: Al descargar desde el navegador, haz clic derecho en el enlace → "Guardar enlace como..." y guárdalo con el nombre exacto (incluyendo `.shard1`).

4. **Verifica que los archivos se descargaron correctamente:**
   ```bash
   ls -lh src/assets/face-api-models/*-shard1
   ```
   
   Deberías ver archivos con varios KB o MB de tamaño (no 14 bytes).

5. **Reinicia el servidor de desarrollo de Angular:**
   ```bash
   # Detén el servidor (Ctrl+C) y reinícialo
   npm start
   ```

## Estructura final esperada

```
src/assets/face-api-models/
├── tiny_face_detector_model-weights_manifest.json (✅ ya creado)
├── tiny_face_detector_model-shard1 (⚠️ necesitas descargar - varios KB)
├── face_landmark_68_model-weights_manifest.json (✅ ya creado)
├── face_landmark_68_model-shard1 (⚠️ necesitas descargar - varios MB)
├── face_recognition_model-weights_manifest.json (✅ ya creado)
├── face_recognition_model-shard1 (⚠️ necesitas descargar - varios MB)
├── README.md
└── DOWNLOAD_INSTRUCTIONS.md (este archivo)
```

## Solución de problemas

Si después de descargar los archivos aún obtienes errores 404:

1. Verifica que los archivos estén en `src/assets/face-api-models/` (no en `public/assets/face-api-models/`)
2. Reinicia completamente el servidor de desarrollo de Angular
3. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
4. Verifica que los archivos tengan tamaño real (no 14 bytes)

