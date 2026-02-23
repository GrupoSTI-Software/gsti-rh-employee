# 🚀 Inicio Rápido: ngrok para Passkeys

## 📋 Prerrequisitos

1. **ngrok instalado**:
   ```bash
   brew install ngrok
   ```

2. **Obtén tu IP local**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   
   Ejemplo de salida:
   ```
   inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
   ```
   
   Tu IP es: `192.168.1.100` ← Guarda esto

---

## ⚙️ Configuración (Solo Primera Vez)

### 1. Actualiza `environment.ngrok.ts`

Abre `src/environments/environment.ngrok.ts` y cambia `TU_IP_LOCAL` por tu IP real:

```typescript
export const environment = {
  PRODUCTION: false,
  API_URL: 'http://192.168.1.100:3333/api', // 👈 Tu IP aquí
  FACE_API_MODELS_URL: 'https://justadudewhohacks.github.io/face-api.js/models'
};
```

### 2. Verifica el Backend `.env`

Asegúrate de que tu backend tenga estas variables configuradas:

```env
HOST=0.0.0.0
PORT=3333
RP_ORIGIN=https://unmollified-kayla-refractively.ngrok-free.dev
RP_ID=unmollified-kayla-refractively.ngrok-free.dev
RP_NAME="GSTI RH"
```

---

## 🏃 Ejecutar (3 Terminales)

### Terminal 1: Backend

```bash
cd /Users/rogeliojinestasgarcia/Sites/gsti-rh-api
npm run dev
```

**Verifica**: Debería mostrar `Server address: http://0.0.0.0:3333`

---

### Terminal 2: Frontend con ngrok

```bash
cd /Users/rogeliojinestasgarcia/Sites/proyects/gsti-pwa-empleado
ng serve --configuration=ngrok
```

**Verifica**: Debería mostrar `Application running at: http://localhost:4200`

---

### Terminal 3: ngrok

```bash
ngrok http 4200
```

**Verifica**: Debería mostrar algo como:
```
Forwarding  https://unmollified-kayla-refractively.ngrok-free.dev -> http://localhost:4200
```

---

## 📱 Probar en tu Celular

1. **Asegúrate de estar en la misma WiFi** que tu Mac

2. **Abre el navegador** en tu celular

3. **Navega a**: `https://unmollified-kayla-refractively.ngrok-free.dev`

4. **Si aparece "Visit Site"**: Haz clic en el botón

5. **Listo**: Deberías ver la aplicación funcionando

---

## ✅ Verificar que Funciona

### En tu Mac (`http://localhost:4200`)

✅ Inicia sesión normalmente  
✅ Ve a Configuración → Autenticación Biométrica  
✅ Registra una Passkey  
✅ Cierra sesión  
✅ Inicia sesión con Passkey (Touch ID / huella)

### En tu Celular (`https://unmollified-kayla-refractively.ngrok-free.dev`)

✅ Inicia sesión normalmente  
✅ Ve a Configuración → Autenticación Biométrica  
✅ Registra una Passkey  
✅ Debería activarse **Face ID** o **Touch ID** de tu celular  
✅ Cierra sesión  
✅ Inicia sesión con Passkey (biometría del celular)

---

## 🐛 Solución de Problemas

### "Cannot connect to backend"

**Problema**: El celular no puede conectarse al backend

**Solución**:
1. Verifica que tu IP en `environment.ngrok.ts` sea correcta
2. Verifica que el backend esté corriendo (`http://0.0.0.0:3333`)
3. Verifica que ambos dispositivos estén en la **misma WiFi**

### "Mixed Content Error"

**Problema**: El navegador bloquea peticiones HTTP desde HTTPS

**Solución**: 
- En Chrome móvil: Ve a Configuración → Configuración del sitio → Contenido no seguro → Permitir
- Alternativa: Usa Safari en iOS (suele permitirlo automáticamente)

### "Visit Site" en ngrok

**Solución**: Es normal con ngrok gratis. Solo haz clic en "Visit Site".

### Backend no responde

```bash
# Verifica que el backend esté escuchando en todas las interfaces
lsof -i :3333

# Debería mostrar algo como:
# node    12345 user   24u  IPv4 0x...  0t0  TCP *:3333 (LISTEN)
```

---

## 🔄 Comandos Útiles

### Obtener tu IP actual

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

### Verificar que el backend está accesible desde la red

```bash
curl http://TU_IP_LOCAL:3333
# Debería devolver algo (no error de conexión)
```

### Reiniciar todo rápido

```bash
# Terminal 1
cd ~/Sites/gsti-rh-api && npm run dev

# Terminal 2
cd ~/Sites/proyects/gsti-pwa-empleado && ng serve --configuration=ngrok

# Terminal 3
ngrok http 4200
```

---

## 📚 Documentación Completa

Para más detalles, consulta `docs/NGROK_SETUP.md`.

---

## ⏭️ Siguiente Paso

Una vez que funcione en tu celular, ¡prueba registrar y usar un Passkey con Face ID o Touch ID! 🎉
