// 🌐 Configuración para usar con LocalTunnel en dispositivos móviles
// 
// LocalTunnel permite exponer tanto el frontend como el backend con HTTPS
// 
// Paso 1: Instalar LocalTunnel
//   npm install -g localtunnel
//
// Paso 2: Levantar el backend
//   Terminal 1: cd ~/Sites/gsti-rh-api && npm run dev
//
// Paso 3: Levantar túnel para el backend
//   Terminal 2: lt --port 3333 --subdomain gsti-api
//   Verás: your url is: https://gsti-api.loca.lt
//
// Paso 4: Actualiza API_URL con tu URL de LocalTunnel
// Paso 5: Actualiza el backend .env:
//   RP_ORIGIN=https://gsti-frontend.loca.lt
//   RP_ID=gsti-frontend.loca.lt
//
// Paso 6: Levantar el frontend
//   Terminal 3: ng serve --configuration=localtunnel
//
// Paso 7: Levantar túnel para el frontend
//   Terminal 4: lt --port 4200 --subdomain gsti-frontend
//   Verás: your url is: https://gsti-frontend.loca.lt
//
// Paso 8: Abre en tu celular: https://gsti-frontend.loca.lt

export const environment = {
  PRODUCTION: false,
  API_URL: 'https://gsti-api.loca.lt/api', // 👈 LocalTunnel Backend (HTTPS)
  FACE_API_MODELS_URL: 'https://justadudewhohacks.github.io/face-api.js/models'
};
