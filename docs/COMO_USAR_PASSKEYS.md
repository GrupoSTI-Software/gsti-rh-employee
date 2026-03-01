# 🔐 Cómo Usar Passkeys - Guía Completa

## 📝 ¿Qué son las Passkeys?

Las Passkeys te permiten iniciar sesión usando la biometría de tu dispositivo (huella digital, Face ID, Windows Hello) en lugar de tu contraseña. Es más rápido y más seguro.

---

## 🚀 Cómo Registrar tu Primera Passkey

### Método 1: Desde la Aplicación (Recomendado)

#### Paso 1: Inicia Sesión Normalmente
1. Abre la aplicación: `http://localhost:4200`
2. Ingresa tu **email** y **contraseña**
3. Haz clic en "Iniciar Sesión"

#### Paso 2: Ve a Configuración
1. Una vez dentro, ve al menú de navegación
2. Selecciona **"Configuración"**
3. Verás una opción **"Autenticación Biométrica"** con el ícono 👆
4. Haz clic en esa opción

#### Paso 3: Registra tu Passkey
1. Escribe un nombre para tu dispositivo (ej: "iPhone de Juan", "Laptop Personal")
2. Haz clic en **"Configurar Biometría"**
3. Tu navegador te pedirá usar tu biometría (huella, Face ID, etc.)
4. Autentica con tu biométrico
5. ¡Listo! Verás el mensaje: **"¡Biometría configurada exitosamente!"**

#### Paso 4: Prueba tu Passkey
1. Cierra sesión
2. En el login, escribe tu email
3. Verás aparecer el botón **"Iniciar con Biometría"** 🎉
4. Haz clic y usa tu huella/Face ID
5. ¡Acceso instantáneo!

---

### Método 2: Modo Demo (Para Pruebas sin Backend)

Si el backend aún no está configurado, puedes probar con el modo demo:

#### Paso 1: Abre la Consola del Navegador
1. Presiona `F12` (o `Cmd + Option + I` en Mac)
2. Ve a la pestaña **Console**

#### Paso 2: Ejecuta el Script de Registro

Copia y pega este código:

```javascript
// Obtener el servicio de demo
const injector = window.ng?.getInjector?.(document.querySelector('app-root'));

if (!injector) {
  console.error('❌ No se pudo obtener el injector. Asegúrate de estar en la página correcta.');
} else {
  try {
    const PasskeyDemoService = injector.get('PasskeyDemoService');
    
    // Registrar una Passkey
    // Cambia el email y nombre del dispositivo según necesites
    await PasskeyDemoService.registerDemo('test@ejemplo.com', 'Mi iPhone');
    
    console.log('✅ Passkey registrada! Ahora recarga la página y prueba el login.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

#### Paso 3: Sigue las Instrucciones del Navegador
1. Tu navegador mostrará un prompt biométrico
2. Usa tu huella digital o Face ID
3. Verás en la consola:
   ```
   🔐 [DEMO] Iniciando registro de Passkey...
   ✅ [DEMO] Credencial creada: ADSUllKQ...
   ✅ [DEMO] Passkey registrada exitosamente
   ```

#### Paso 4: Prueba el Login
1. Recarga la página (`F5` o `Cmd + R`)
2. Escribe el mismo email: `test@ejemplo.com`
3. Aparecerá el botón **"Iniciar con Biometría"**
4. Haz clic y usa tu biométrico
5. ¡Listo!

---

## 🔍 Comandos Útiles de la Consola

### Ver Passkeys Registradas

```javascript
const injector = window.ng?.getInjector?.(document.querySelector('app-root'));
const PasskeyDemoService = injector.get('PasskeyDemoService');

// Ver todas las passkeys
const credentials = PasskeyDemoService.getRegisteredCredentials();
console.table(credentials);
```

### Verificar si un Email tiene Passkeys

```javascript
const injector = window.ng?.getInjector?.(document.querySelector('app-root'));
const PasskeyDemoService = injector.get('PasskeyDemoService');

// Verificar email específico
const hasPasskeys = PasskeyDemoService.hasPasskeysDemo('test@ejemplo.com');
console.log(`¿Tiene Passkeys?: ${hasPasskeys ? 'Sí' : 'No'}`);
```

### Eliminar Todas las Passkeys

```javascript
const injector = window.ng?.getInjector?.(document.querySelector('app-root'));
const PasskeyDemoService = injector.get('PasskeyDemoService');

// Limpiar todo
PasskeyDemoService.clearAllCredentials();
console.log('🗑️ Todas las Passkeys han sido eliminadas');
```

---

## ❓ Preguntas Frecuentes

### ¿Por qué dice "No passkeys found"?

**Respuesta:** Necesitas registrar una Passkey primero. Sigue los pasos de registro arriba.

### ¿El botón de Passkey NO aparece?

**Verifica:**
1. ✅ ¿Escribiste un email válido? (ej: `test@ejemplo.com`)
2. ✅ ¿Tu navegador soporta WebAuthn? (Chrome, Safari, Edge, Firefox)
3. ✅ Abre la consola (F12) y busca mensajes de error

### ¿Cómo sé si mi navegador soporta Passkeys?

Abre la consola (F12) y ejecuta:

```javascript
if (window.PublicKeyCredential) {
  console.log('✅ Tu navegador SOPORTA Passkeys');
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then(available => {
      console.log(available ? 
        '✅ Tienes biometría disponible (Touch ID, Face ID, etc.)' : 
        '⚠️ No hay biometría configurada en este dispositivo');
    });
} else {
  console.log('❌ Tu navegador NO soporta Passkeys. Actualiza tu navegador.');
}
```

### ¿Puedo tener múltiples Passkeys?

**Sí!** Puedes registrar una Passkey en cada dispositivo:
- iPhone personal
- iPad
- Laptop de trabajo
- Desktop de casa
- etc.

Cada dispositivo tendrá su propia Passkey.

### ¿Qué pasa si pierdo mi dispositivo?

No te preocupes:
1. Siempre puedes iniciar sesión con tu contraseña tradicional
2. En Configuración, puedes ver y eliminar Passkeys antiguas
3. Puedes registrar una nueva Passkey en tu nuevo dispositivo

### ¿Es seguro?

**¡Muy seguro!** Las Passkeys son más seguras que las contraseñas porque:
- ✅ La clave privada nunca sale de tu dispositivo
- ✅ No se puede hacer phishing (cada sitio tiene su propia clave)
- ✅ No se puede interceptar (usa criptografía de clave pública)
- ✅ Requiere tu biométrico para usarse

---

## 🌐 Compatibilidad de Navegadores

| Navegador | Versión | Soporte | Biometría |
|-----------|---------|---------|-----------|
| Chrome    | 67+     | ✅      | Touch ID, Windows Hello |
| Safari    | 13+     | ✅      | Touch ID, Face ID |
| Firefox   | 60+     | ✅      | Según OS |
| Edge      | 79+     | ✅      | Windows Hello |

---

## 📱 Compatibilidad de Dispositivos

| Plataforma | Versión | Biometría Disponible |
|------------|---------|---------------------|
| iOS        | 16+     | Touch ID, Face ID |
| Android    | 9+      | Huella, Face Unlock |
| Windows    | 10+     | Windows Hello |
| macOS      | 13+     | Touch ID |

---

## 🚨 Solución de Problemas

### Error: "NotAllowedError"

**Causa:** Cancelaste el prompt o tardaste mucho

**Solución:** Intenta de nuevo y completa el proceso rápidamente

### Error: "NotSupportedError"

**Causa:** Tu navegador o dispositivo no soporta WebAuthn

**Solución:** 
- Actualiza tu navegador
- Prueba con Chrome o Safari
- Verifica que tu dispositivo tenga biometría configurada

### Error: "InvalidStateError"

**Causa:** Ya existe una Passkey registrada

**Solución:** Esta Passkey ya está registrada. Usa otro dispositivo o elimina la existente primero.

### Error: "SecurityError"

**Causa:** No estás en una conexión segura (HTTPS)

**Solución:**
- En desarrollo, usa `localhost` (NO `127.0.0.1`)
- En producción, asegúrate de tener HTTPS

---

## 💡 Tips Pro

1. **Prueba primero en modo demo** para familiarizarte
2. **Registra passkeys en todos tus dispositivos** para mayor comodidad
3. **Usa nombres descriptivos** para tus dispositivos (ej: "iPhone 14 Pro", "MacBook Air M2")
4. **No compartas tus dispositivos** - cada quien debe tener su propia Passkey
5. **Mantén tu contraseña segura** como método de respaldo

---

## 🎯 Resumen Rápido

### Para Usuarios Finales:
1. Login normal → Configuración → Autenticación Biométrica
2. Registra tu huella/Face ID
3. Logout y prueba "Iniciar con Biometría"

### Para Desarrolladores:
1. Abre consola (F12)
2. `PasskeyDemoService.registerDemo('email', 'dispositivo')`
3. Sigue el prompt biométrico
4. Prueba el login

---

¿Necesitas más ayuda? Revisa:
- `docs/PASSKEYS_TESTING_GUIDE.md` - Guía técnica completa
- `docs/PASSKEYS_IMPLEMENTATION.md` - Documentación para desarrolladores
- `docs/PASSKEYS_SUMMARY.md` - Resumen de la implementación

¡Disfruta del acceso rápido y seguro con Passkeys! 🎉
