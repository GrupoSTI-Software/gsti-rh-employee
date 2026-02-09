#!/bin/bash

# Script para descargar los modelos de face-api.js
# Ejecutar desde la raíz del proyecto: bash scripts/download-face-api-models.sh

MODELS_DIR="src/assets/face-api-models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master"

# Crear el directorio si no existe
mkdir -p "$MODELS_DIR"

echo "Descargando modelos de face-api.js..."
echo "Directorio destino: $MODELS_DIR"
echo ""

# Descargar cada modelo
echo "Descargando tiny_face_detector_model..."
curl -L -o "$MODELS_DIR/tiny_face_detector_model-weights_manifest.json" "$BASE_URL/tiny_face_detector_model-weights_manifest.json"
curl -L -o "$MODELS_DIR/tiny_face_detector_model-shard1" "$BASE_URL/tiny_face_detector_model-shard1"

echo "Descargando face_landmark_68_model..."
curl -L -o "$MODELS_DIR/face_landmark_68_model-weights_manifest.json" "$BASE_URL/face_landmark_68_model-weights_manifest.json"
curl -L -o "$MODELS_DIR/face_landmark_68_model-shard1" "$BASE_URL/face_landmark_68_model-shard1"

echo "Descargando face_recognition_model..."
curl -L -o "$MODELS_DIR/face_recognition_model-weights_manifest.json" "$BASE_URL/face_recognition_model-weights_manifest.json"
curl -L -o "$MODELS_DIR/face_recognition_model-shard1" "$BASE_URL/face_recognition_model-shard1"

echo ""
echo "¡Descarga completada!"
echo "Verificando archivos descargados..."
ls -lh "$MODELS_DIR"/*.json "$MODELS_DIR"/*-shard1 2>/dev/null | grep -v README

