# 🚀 Inicio Rápido: LocalTunnel para Passkeys

## 🎯 Solución al Problema "Mixed Content"

LocalTunnel expone tanto el frontend como el backend con **HTTPS**, resolviendo el problema de "Mixed Content" que impide que tu celular se conecte al backend.

---

## ⚡ Instalación (Solo Primera Vez)

```bash
npm install -g localtunnel
```

---

## 🏃 Ejecutar (4 Terminales)

### Terminal 1: Backend

```bash
cd /Users/rogeliojinestasgarcia/Sites/gsti-rh-api
npm run dev
```

Verifica que muestre:
```
Server address: http://0.0.0.0:3333
```

---

### Terminal 2: Túnel para Backend

```bash
lt --port 3333 --subdomain gsti-api
```

Verás algo como:
```
your url is: https://gsti-api.loca.lt
```

**Importante**: Copia esta URL, la necesitarás.

---

### Terminal 3: Frontend

```bash
cd /Users/rogeliojinestasgarcia/Sites/proyects/gsti-pwa-empleado
ng serve --configuration=localtunnel
```

Verifica que muestre:
```
Application running at: http://localhost:4200
```

---

### Terminal 4: Túnel para Frontend

```bash
lt --port 4200 --subdomain gsti-frontend
```

Verás algo como:
```
your url is: https://gsti-frontend.loca.lt
```

**Esta es la URL que abrirás en tu celular** ✅

---

## ⚙️ Configuración (Solo Primera Vez)

### 1. Actualizar Backend .env

Abre `/Users/rogeliojinestasgarcia/Sites/gsti-rh-api/.env` y actualiza:

```env
RP_ORIGIN=https://gsti-frontend.loca.lt
RP_ID=gsti-frontend.loca.lt
RP_NAME="GSTI RH"
```

**Nota**: Ya está configurado en `environment.localtunnel.ts` con:
```
API_URL: 'https://gsti-api.loca.lt/api'
```

### 2. Reiniciar Backend (solo si cambiaste .env)

```bash
# Terminal 1: Presiona Ctrl + C
npm run dev
```

---

## 📱 Probar en el Celular

### 1. Abre el navegador en tu celular

### 2. Ve a la URL del frontend

```
https://gsti-frontend.loca.lt
```

### 3. Primera vez: Pantalla de LocalTunnel

LocalTunnel mostrará una pantalla de seguridad. Haz lo siguiente:

1. Verás un mensaje: "Tunnel Password Required"
2. Copia la IP que te muestra (algo como: `192.168.68.107`)
3. Haz clic en "Click here to continue"
4. Pega la IP en el campo
5. Haz clic en "Submit"

**Solo necesitas hacer esto una vez por sesión**.

### 4. Repite para el Backend

Si la app hace una petición al backend y ve la pantalla de LocalTunnel:

1. Abre una nueva pestaña: `https://gsti-api.loca.lt`
2. Haz el mismo proceso de verificación
3. Vuelve a la app

---

## ✅ Verificar que Funciona

Deberías poder:

1. ✅ Ver la pantalla de login
2. ✅ Iniciar sesión con email y contraseña
3. ✅ Ver el dashboard
4. ✅ Ir a Configuración → Autenticación Biométrica
5. ✅ Registrar una Passkey (se activará Face ID / Touch ID)
6. ✅ Cerrar sesión
7. ✅ Iniciar sesión con Passkey usando biometría del celular

---

## 🔄 Sesiones Futuras

Las URLs de LocalTunnel con `--subdomain` son persistentes, así que para futuras sesiones solo necesitas:

```bash
# Terminal 1: Backend
cd ~/Sites/gsti-rh-api && npm run dev

# Terminal 2: Túnel Backend
lt --port 3333 --subdomain gsti-api

# Terminal 3: Frontend
cd ~/Sites/proyects/gsti-pwa-empleado && ng serve --configuration=localtunnel

# Terminal 4: Túnel Frontend
lt --port 4200 --subdomain gsti-frontend
```

Y abrir en el celular: `https://gsti-frontend.loca.lt`

---

## 🐛 Solución de Problemas

### "Tunnel is already in use"

**Causa**: Ya hay un túnel corriendo con ese subdomain.

**Solución**:
1. Busca procesos de lt: `ps aux | grep lt`
2. Mata el proceso: `kill -9 PID`
3. O usa otro subdomain: `lt --port 3333 --subdomain gsti-api-2`

### "Connection refused"

**Causa**: El backend o frontend no están corriendo.

**Verificar**:
```bash
# Backend
curl http://localhost:3333
# Debería responder

# Frontend
curl http://localhost:4200
# Debería responder con HTML
```

### "Invalid Host header"

**Solución**: Angular ya está configurado con `allowedHosts: ["*.loca.lt"]` en `angular.json`.

Si persiste, reinicia el frontend.

### "Mixed Content" persiste

**Verificar**:
1. Que estés usando `--configuration=localtunnel` al levantar el frontend
2. Que `environment.localtunnel.ts` tenga `https://gsti-api.loca.lt/api`
3. Abre consola del navegador en el celular y verifica que las peticiones vayan a HTTPS

---

## 💡 Consejos

### Usar un Script

Crea `start-localtunnel.sh`:

```bash
#!/bin/bash

echo "🚀 Iniciando LocalTunnel para GSTI..."

# Verificar si LocalTunnel está instalado
if ! command -v lt &> /dev/null; then
    echo "❌ LocalTunnel no está instalado"
    echo "Ejecuta: npm install -g localtunnel"
    exit 1
fi

echo ""
echo "📋 Abre 4 terminales y ejecuta:"
echo ""
echo "Terminal 1: cd ~/Sites/gsti-rh-api && npm run dev"
echo "Terminal 2: lt --port 3333 --subdomain gsti-api"
echo "Terminal 3: cd ~/Sites/proyects/gsti-pwa-empleado && ng serve --configuration=localtunnel"
echo "Terminal 4: lt --port 4200 --subdomain gsti-frontend"
echo ""
echo "📱 En tu celular: https://gsti-frontend.loca.lt"
echo ""
```

### URLs Permanentes

Si quieres que tus URLs sean más fáciles de recordar, siempre usa los mismos subdomains:
- Backend: `gsti-api`
- Frontend: `gsti-frontend`

### Desactivar LocalTunnel

Simplemente presiona **Ctrl + C** en las terminales donde corre `lt`.

---

## 🆚 Comparación con ngrok

| Característica | LocalTunnel | ngrok (gratis) |
|----------------|-------------|----------------|
| Múltiples túneles | ✅ Sí | ❌ No (solo 1) |
| Precio | Gratis | Gratis (1 túnel) |
| Subdomain personalizado | ✅ Sí | ❌ No |
| Pantalla de advertencia | ✅ Sí (primera vez) | ✅ Sí (siempre) |
| Velocidad | Media | Rápida |
| Estabilidad | Buena | Muy buena |

**Para desarrollo de Passkeys**: LocalTunnel es perfecto porque necesitas exponer 2 servicios (frontend y backend) con HTTPS.

---

## 🎉 ¡Listo!

Ahora puedes probar tus Passkeys en un dispositivo móvil real con Face ID o Touch ID.
