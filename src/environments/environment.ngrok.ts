// 🌐 Configuración para usar con ngrok en dispositivos móviles
//
// IMPORTANTE: Reemplaza "TU_IP_LOCAL" con la IP de tu Mac en la red WiFi
// Para obtener tu IP, ejecuta en la terminal:
//   ipconfig getifaddr en0
// O:
//   ifconfig | grep "inet " | grep -v 127.0.0.1
//
// Ejemplo: Si tu IP es 192.168.1.100, cambia:
//   API_URL: 'http://192.168.1.100:3333/api'

export const environment = {
  PRODUCTION: false,
  API_URL: 'https://helpless-fox-89.loca.lt/api', // ✅ IP local de tu Mac
  FACE_API_MODELS_URL: 'https://justadudewhohacks.github.io/face-api.js/models'
};
