# Guía de Despliegue

## Configuración del archivo .env en el servidor

### Problema común: El archivo .env se borra durante el build

El archivo `.env` está en `.gitignore` y no se sube al repositorio por seguridad. Esto puede causar que el archivo no exista en el servidor durante el proceso de build.

### Soluciones

#### Opción 1: Crear el archivo .env manualmente en el servidor

Antes de ejecutar `npm run build`, asegúrate de que el archivo `.env` exista en la raíz del proyecto:

```bash
# Verificar si existe el archivo .env
ls -la .env

# Si no existe, créalo desde .env.example
cp .env.example .env

# Edita el archivo con las variables correctas
nano .env
# o
vi .env
```

#### Opción 2: Usar variables de entorno del sistema (CI/CD)

Si estás usando un sistema de CI/CD (GitHub Actions, GitLab CI, Jenkins, etc.), configura las variables de entorno en el pipeline y crea el archivo `.env` automáticamente:

**Ejemplo para GitHub Actions:**

```yaml
- name: Crear archivo .env
  run: |
    echo "PRODUCTION=${{ secrets.PRODUCTION }}" >> .env
    echo "API_BASE_URL=${{ secrets.API_BASE_URL }}" >> .env
    echo "FIREBASE_API_KEY=${{ secrets.FIREBASE_API_KEY }}" >> .env
    # ... agregar todas las variables necesarias
```

**Ejemplo para GitLab CI:**

```yaml
before_script:
  - |
    cat > .env << EOF
    PRODUCTION=${PRODUCTION}
    API_BASE_URL=${API_BASE_URL}
    FIREBASE_API_KEY=${FIREBASE_API_KEY}
    EOF
```

#### Opción 3: Usar un archivo .env persistente en el servidor

Si el servidor limpia el directorio antes del build, crea el `.env` en una ubicación persistente y cópialo antes del build:

```bash
# Guardar .env en una ubicación segura
cp .env /var/app/.env.backup

# En el script de deploy, restaurarlo antes del build
cp /var/app/.env.backup .env
npm run build
```

### Verificación

El script `ensure-env.js` ahora verifica automáticamente la existencia del archivo `.env` antes del build:

```bash
npm run build
```

Si el archivo `.env` no existe:
- ✅ Se creará automáticamente desde `.env.example` si existe
- ⚠️ Se creará un archivo vacío con comentarios si no existe `.env.example`
- ❌ El proceso fallará con un mensaje claro si el archivo está vacío

### Variables de entorno requeridas

Asegúrate de que tu archivo `.env` contenga todas las variables necesarias. Consulta `.env.example` para ver la lista completa.

Variables mínimas requeridas:
- `PRODUCTION` - Indica si es entorno de producción (true/false)
- `API_BASE_URL` - URL base de la API
- Variables de Firebase (si usas Firebase):
  - `FIREBASE_API_KEY`
  - `FIREBASE_AUTH_DOMAIN`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_STORAGE_BUCKET`
  - `FIREBASE_MESSAGING_SENDER_ID`
  - `FIREBASE_APP_ID`
  - `FIREBASE_VAPID_KEY`

### Logs de verificación

Durante el build, verás logs como estos:

```
🔍 Verificando archivo .env...
   Ruta: /ruta/al/proyecto/.env
   Existe: ✅ Sí
   Tamaño: 1234 bytes
   Última modificación: 2026-03-05T10:30:00.000Z
✅ Archivos de entorno generados correctamente
```

Si hay algún problema, verás un error claro indicando qué falta.

## Seguridad

⚠️ **IMPORTANTE**: 
- Nunca subas el archivo `.env` al repositorio
- Nunca expongas las variables de entorno en logs públicos
- Usa secretos/variables cifradas en tu sistema de CI/CD
- Restringe el acceso al archivo `.env` en el servidor (chmod 600)
