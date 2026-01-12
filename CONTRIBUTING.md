# Guía de Contribución

## Flujo de Trabajo con Git

### 1. Hacer Commits

Este proyecto usa **Conventional Commits** para mantener un historial de cambios claro y estructurado.

#### Formato de Commit

```
<tipo>: <Descripción en español>

[Cuerpo opcional en español - sin límite de caracteres]

[Footer opcional en español]
```

#### Reglas del Mensaje de Commit

| Elemento | Regla |
|----------|-------|
| **Tipo** | Siempre en **minúsculas** y en **inglés** |
| **Descripción** | En **español**, puede iniciar con mayúscula |
| **Cuerpo** | En **español**, sin límite de caracteres |
| **Footer** | En **español**, sin límite de caracteres |

#### Tipos de Commit (en inglés y minúsculas)

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `feat` | Nueva funcionalidad | `feat: Agregar módulo de reportes` |
| `fix` | Corrección de error | `fix: Corregir cálculo de horas extras` |
| `docs` | Documentación | `docs: Actualizar guía de instalación` |
| `style` | Formato de código | `style: Aplicar prettier a componentes` |
| `refactor` | Refactorización | `refactor: Simplificar lógica del servicio` |
| `perf` | Mejora de rendimiento | `perf: Optimizar carga de imágenes` |
| `test` | Tests | `test: Agregar tests para AuthService` |
| `build` | Build/dependencias | `build: Actualizar Angular a v21` |
| `ci` | Integración continua | `ci: Agregar workflow de GitHub Actions` |
| `chore` | Tareas de mantenimiento | `chore: Limpiar archivos temporales` |
| `revert` | Revertir cambios | `revert: Revertir commit abc123` |

#### Ejemplos de Buenos Commits

```bash
# Commit simple
git commit -m "feat: Agregar componente de login"

# Commit con descripción en mayúscula inicial
git commit -m "fix: Corregir validación de correo electrónico"

# Commit con cuerpo descriptivo extenso (sin límite de caracteres)
git commit -m "feat: Implementar sistema de notificaciones push

Este commit agrega el sistema completo de notificaciones push con las siguientes características:
- Integración con Firebase Cloud Messaging para notificaciones en tiempo real
- Soporte para notificaciones en segundo plano cuando la aplicación está cerrada
- Configuración de permisos y manejo de tokens de dispositivo
- Persistencia de preferencias de notificación del usuario
- Componente de configuración en el módulo de ajustes

Se incluyeron pruebas unitarias para el servicio de notificaciones y pruebas de integración para el flujo completo de suscripción.

Cierra el issue #45"

# Commit con breaking change
git commit -m "feat: Cambiar estructura de respuesta de la API de usuario

CAMBIO IMPORTANTE: La respuesta de /api/user ahora retorna un objeto con formato { datos, metadatos } en lugar del objeto de usuario directamente. Todos los consumidores de esta API deben actualizar su código para acceder a los datos del usuario mediante response.datos."
```

#### Ejemplos de Commits Inválidos

```bash
git commit -m "agregando feature"  # ❌ No sigue el formato tipo: descripción
git commit -m "FEAT: Algo nuevo"   # ❌ El tipo debe ser en minúsculas
git commit -m "feature: Nuevo"     # ❌ Tipo no permitido (usar feat)
git commit -m "Feat: Algo"         # ❌ El tipo debe ser completamente en minúsculas
```

### 2. Validaciones Automáticas

#### Al hacer commit (commit-msg)

El mensaje de tu commit será validado automáticamente:

```bash
# ✅ Estos funcionarán
git commit -m "feat: Nueva funcionalidad"
git commit -m "fix: Corregir error en el formulario de registro"

# ❌ Estos serán rechazados
git commit -m "agregando algo"     # No sigue el formato
git commit -m "FEAT: Algo"         # Tipo en mayúsculas
```

#### Al hacer push (pre-push)

Antes de cada push se ejecutan automáticamente:

1. **Linter (ESLint)**: Verifica la calidad del código
2. **Build**: Compila el proyecto

```bash
git push origin mi-rama

# Salida esperada:
# 🔍 Ejecutando linter...
# ✅ Linter pasó correctamente
# 🏗️  Compilando proyecto...
# ✅ Build completado exitosamente
# 🚀 Listo para hacer push!
```

Si alguna validación falla, el push será rechazado y verás el error:

```bash
# ❌ Si el linter falla:
# 🔍 Ejecutando linter...
# ❌ El linter encontró errores. Por favor corrígelos antes de hacer push.

# ❌ Si el build falla:
# 🏗️  Compilando proyecto...
# ❌ El build falló. Por favor corrige los errores antes de hacer push.
```

### 3. Solucionar Errores Comunes

#### Errores de Linter

```bash
# Ver todos los errores
npm run lint

# Corregir automáticamente los que se puedan
npm run lint:fix
```

#### Errores de Build

```bash
# Compilar y ver errores
npm run build

# Los errores más comunes son:
# - Imports faltantes
# - Variables no usadas
# - Errores de tipo TypeScript
```

### 4. Saltarse Validaciones (NO RECOMENDADO)

En casos excepcionales, puedes saltarte las validaciones:

```bash
# Saltarse validación de commit message
git commit --no-verify -m "mensaje cualquiera"

# Saltarse validación de pre-push
git push --no-verify
```

⚠️ **ADVERTENCIA**: Solo usa `--no-verify` en casos excepcionales como:
- Hotfix urgente en producción
- Revert de emergencia
- Situaciones aprobadas por el equipo

### 5. Flujo de Trabajo Recomendado

```bash
# 1. Crear una rama para tu feature/fix
git checkout -b feat/nueva-funcionalidad

# 2. Hacer cambios y commits frecuentes
git add .
git commit -m "feat: Agregar validación de formulario"
git commit -m "style: Mejorar estilos del componente"

# 3. Antes de push, verificar manualmente
npm run lint        # Verificar linter
npm run build       # Verificar build

# 4. Push (las validaciones se ejecutarán automáticamente)
git push origin feat/nueva-funcionalidad

# 5. Crear Pull Request en GitHub/GitLab
```

### 6. Convenciones de Código

#### TypeScript/JavaScript
- Usa `const` y `let`, nunca `var`
- Usa arrow functions para callbacks
- Usa template strings en lugar de concatenación
- Usa `async/await` en lugar de `.then()`

#### Angular
- Un componente por archivo
- Usa `inject()` en lugar de constructor injection (Angular 21+)
- Usa signals cuando sea apropiado
- Sigue la arquitectura hexagonal del proyecto

#### Estilos SCSS
- Usa las variables definidas en `src/styles/_variables.scss`
- Usa los mixins de `src/styles/_mixins.scss`
- Mantén los estilos específicos del componente en su archivo `.scss`

### 7. Recursos Adicionales

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Style Guide](https://angular.dev/style-guide)
- [Arquitectura Hexagonal](https://alistair.cockburn.us/hexagonal-architecture/)

## ¿Dudas?

Si tienes dudas sobre el flujo de trabajo, consulta con el equipo o revisa:
- [README.md](./README.md) - Documentación general
- [.husky/README.md](./.husky/README.md) - Detalles de los git hooks
