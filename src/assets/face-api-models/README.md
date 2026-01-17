# Modelos de face-api.js

Este directorio contiene los modelos necesarios para el reconocimiento facial.

## Ubicación

Los modelos deben estar en `src/assets/face-api-models/` para que Angular los sirva correctamente en la ruta `/assets/face-api-models/`.

## Instalación

1. Descarga los modelos desde el repositorio oficial de face-api.js:
   - Ve a: https://github.com/justadudewhohacks/face-api.js-models
   - O descarga directamente desde: https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/

2. Descarga los siguientes archivos y colócalos en este directorio (`src/assets/face-api-models/`):
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`

## Estructura de archivos

```
src/assets/face-api-models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
└── README.md
```

## Descarga automática (Recomendado)

Ejecuta el script desde la raíz del proyecto:

```bash
bash scripts/download-face-api-models.sh
```

Este script descargará automáticamente todos los modelos necesarios.

## Descarga manual

Si prefieres descargar los modelos manualmente, puedes usar estos comandos:

```bash
cd src/assets/face-api-models
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-weights_manifest.json
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-shard1
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-weights_manifest.json
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-shard1
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-weights_manifest.json
curl -L -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-shard1
```

## Nota

Los modelos son necesarios para que la funcionalidad de comparación facial funcione correctamente. Sin estos archivos, la aplicación mostrará un error al intentar comparar las fotografías.

**Importante**: Los archivos deben estar en `src/assets/face-api-models/` (no en `public/assets/face-api-models/`) para que Angular los sirva correctamente.
