# Modelos de face-api.js

Este directorio debe contener los modelos necesarios para el reconocimiento facial.

## Instalación

1. Descarga los modelos desde el repositorio oficial de face-api.js:
   - Ve a: https://github.com/justadudewhohacks/face-api.js-models
   - O descarga directamente desde: https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/

2. Descarga los siguientes archivos y colócalos en este directorio (`public/assets/face-api-models/`):
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`

## Estructura de archivos

```
public/assets/face-api-models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
└── README.md
```

## Comando rápido (opcional)

Puedes usar este comando para descargar todos los modelos automáticamente:

```bash
cd public/assets/face-api-models
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-shard1
```

## Nota

Los modelos son necesarios para que la funcionalidad de comparación facial funcione correctamente. Sin estos archivos, la aplicación mostrará un error al intentar comparar las fotografías.

