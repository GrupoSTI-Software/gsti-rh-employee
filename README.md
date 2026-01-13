# GSTI PWA Empleado

Aplicación web progresiva (PWA) para empleados de GSTI RH. Permite gestionar asistencia, perfil de usuario y configuraciones personales desde cualquier dispositivo.

## Tecnologías

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| Angular | 21.x | Framework principal |
| TypeScript | 5.9.x | Lenguaje de programación |
| PrimeNG | 21.x | Biblioteca de componentes UI |
| RxJS | 7.8.x | Programación reactiva |
| SCSS | - | Preprocesador CSS |
| Husky | 9.x | Git hooks |
| ESLint | 9.x | Linter de código |
| Vitest | 4.x | Framework de testing |
| ngx-translate | 17.x | Internacionalización |

## Requisitos Previos

- **Node.js**: 20.x o superior
- **npm**: 11.x o superior
- **Angular CLI**: 21.x

```bash
# Verificar versiones instaladas
node -v
npm -v
ng version
```

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd gsti-rh-employee
```

### 2. Instalar dependencias

```bash
npm install
```

> **Nota:** Este comando también configura automáticamente los Git Hooks de Husky.

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y configura las variables:

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://tu-api-url/api',
};
```

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | Inicia servidor de desarrollo con lint en tiempo real |
| `npm run start:dev-only` | Inicia solo el servidor de desarrollo |
| `npm run build` | Compila el proyecto para producción |
| `npm run lint` | Ejecuta ESLint en todo el proyecto |
| `npm run lint:fix` | Corrige automáticamente errores de lint |
| `npm run lint:watch` | Ejecuta lint en modo watch |
| `npm test` | Ejecuta pruebas con Vitest |
| `npm run ssl` | Inicia servidor con SSL habilitado |

### Servidor de Desarrollo

```bash
# Opción recomendada: desarrollo con lint en tiempo real
npm start

# Solo servidor de desarrollo
npm run start:dev-only
```

Navega a `http://localhost:4200/`. La aplicación se recarga automáticamente cuando modificas archivos.

### Compilación para Producción

```bash
npm run build
```

Los artefactos se generan en el directorio `dist/gsti-pwa-empleado/`.

## Arquitectura del Proyecto

Este proyecto implementa **Arquitectura Hexagonal (Ports and Adapters)** combinada con **Vertical Slicing** por módulos.

### Estructura de Capas

```
modules/
  └── [feature]/
      ├── domain/           # Entidades, interfaces de puertos, tokens
      │   ├── entities/     # Interfaces de entidades del dominio
      │   ├── *.port.ts     # Puerto (interfaz) que define el contrato
      │   └── *.token.ts    # InjectionToken para Angular DI
      ├── application/      # Casos de uso (lógica de negocio)
      │   └── *.use-case.ts
      ├── infrastructure/   # Adaptadores (implementaciones concretas)
      │   └── http-*.adapter.ts
      └── presentation/     # Componentes UI (vistas)
          ├── *.component.ts
          ├── *.component.html
          └── *.component.scss
```

### Reglas de Dependencia

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION                            │
│         (Componentes, páginas, UI)                          │
│         ↓ puede importar application y domain               │
├─────────────────────────────────────────────────────────────┤
│                      APPLICATION                             │
│         (Casos de uso, servicios de aplicación)             │
│         ↓ solo puede importar domain                        │
├─────────────────────────────────────────────────────────────┤
│                        DOMAIN                                │
│         (Entidades, puertos, tokens)                        │
│         ✗ NO depende de ninguna capa                        │
├─────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE                           │
│         (Adaptadores HTTP, storage, etc.)                   │
│         ↑ implementa los puertos del domain                 │
│         ✗ NUNCA importar directamente en presentation       │
└─────────────────────────────────────────────────────────────┘
```

### Inyección de Dependencias

La arquitectura hexagonal usa **InjectionTokens** para desacoplar interfaces de implementaciones:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Componente (Presentation Layer)                          │
│    inject(LoginUseCase)                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Caso de Uso (Application Layer)                          │
│    private readonly authPort = inject(AUTH_PORT)            │
│    ↓                                                         │
│    "Necesito algo que cumpla con IAuthPort (interfaz)"      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Angular Dependency Injection                             │
│    "Busco en app.config.ts..."                              │
│    ↓                                                         │
│    "Encontré: provide: AUTH_PORT, useClass: HttpAuthAdapter"│
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Adaptador (Infrastructure Layer)                         │
│    export class HttpAuthAdapter implements IAuthPort ✅     │
└─────────────────────────────────────────────────────────────┘
```

#### Ejemplo de Implementación

**1. Puerto (Interfaz) - `domain/auth.port.ts`**
```typescript
export interface IAuthPort {
  login(email: string, password: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
}
```

**2. Token - `domain/auth.token.ts`**
```typescript
export const AUTH_PORT = new InjectionToken<IAuthPort>('AuthPort');
```

**3. Caso de Uso - `application/login.use-case.ts`**
```typescript
export class LoginUseCase {
  private readonly authPort = inject(AUTH_PORT);
  
  async execute(email: string, password: string): Promise<IAuthResult> {
    return this.authPort.login(email, password, deviceInfo);
  }
}
```

**4. Provider - `app.config.ts`**
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: AUTH_PORT, useClass: HttpAuthAdapter }
  ]
};
```

### Módulos del Proyecto

| Módulo | Descripción |
|--------|-------------|
| `auth` | Autenticación y gestión de sesión |
| `attendance` | Registro de asistencia (check-in/check-out) |
| `system-settings` | Configuración del sistema y branding |
| `dashboard` | Layout principal de la aplicación |
| `profile` | Perfil del usuario |
| `settings` | Configuración de la aplicación |

## Convenciones de Código

### Principios SOLID

El código debe seguir los principios **SOLID**:

- **S**ingle Responsibility: Una clase/componente = una responsabilidad
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Las clases derivadas son sustituibles por sus bases
- **I**nterface Segregation: Interfaces pequeñas y específicas
- **D**ependency Inversion: Depender de abstracciones, no implementaciones

### Angular 21 - Buenas Prácticas

```typescript
// ✅ Usar inject() en lugar de inyección por constructor
private readonly authPort = inject(AUTH_PORT);

// ✅ Usar Signals para estado reactivo
readonly isLoading = signal(false);
readonly userData = computed(() => this.userSignal()?.name);

// ✅ Control flow moderno en templates
@if (isLoading()) {
  <spinner />
} @else {
  <content />
}

// ✅ ChangeDetectionStrategy.OnPush en todos los componentes
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})

// ✅ trackBy en iteraciones
@for (item of items; track item.id) {
  <item-component [data]="item" />
}

// ✅ Componentes standalone
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule]
})
```

### Convenciones de Nombrado

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| **Constantes globales** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRY_ATTEMPTS` |
| **Variables locales** | camelCase | `userData`, `isLoading` |
| **Interfaces** | Prefijo `I` + PascalCase | `IEmployee`, `IAuthResponse` |
| **Enums** | Prefijo `E` + PascalCase | `EPersonType`, `EStatus` |
| **Tipos** | PascalCase | `AuthResponse`, `UserPreferences` |
| **Archivos** | kebab-case | `employee-data.model.ts`, `auth-response.interface.ts` |

#### Archivos de Interfaces y Enums

```bash
# Interfaces: una por archivo con extensión .interface.ts
employee.interface.ts        # export interface IEmployee { ... }
auth-response.interface.ts   # export interface IAuthResponse { ... }

# Enums: uno por archivo con extensión .enum.ts
person-type.enum.ts          # export enum EPersonType { ... }
status.enum.ts               # export enum EStatus { ... }
```

### Estilos SCSS

Los componentes deben usar variables y mixins existentes:

```scss
@use 'src/styles/variables' as *;
@use 'src/styles/mixins' as *;

.my-component {
  @include card;
  padding: $spacing-lg;
  border-radius: $radius-md;
  
  .title {
    font-size: $font-size-xl;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }
  
  .button {
    @include button-primary;
  }
}
```

#### Variables Disponibles

- **Espaciados**: `$spacing-xs` hasta `$spacing-4xl`
- **Border Radius**: `$radius-sm`, `$radius-md`, `$radius-lg`
- **Tamaños de fuente**: `$font-size-xs` hasta `$font-size-3xl`
- **Pesos de fuente**: `$font-weight-normal`, `$font-weight-medium`, `$font-weight-semibold`, `$font-weight-bold`
- **Transiciones**: `$transition-fast`, `$transition-base`, `$transition-slow`
- **Variables CSS**: `var(--primary)`, `var(--text-primary)`, `var(--bg-primary)`, etc.

### Documentación JSDoc

```typescript
/**
 * Obtiene la información del empleado por su identificador.
 *
 * @param employeeId - Identificador único del empleado
 * @returns Promesa con los datos del empleado o null si no existe
 * @throws {HttpErrorResponse} Si hay un error en la comunicación con el servidor
 */
async getEmployeeById(employeeId: string): Promise<IEmployee | null> {
  // ...
}
```

### Logging

```typescript
// ❌ PROHIBIDO: console.log()
console.log('Usuario logueado');

// ✅ PERMITIDO: Solo dentro de bloques catch
try {
  await this.authService.login(credentials);
} catch (error) {
  console.error('Error al iniciar sesión:', error);
}
```

## ESLint y Prettier

### Configuración de ESLint

El proyecto usa ESLint 9 con reglas estrictas de TypeScript y Angular:

```javascript
// Reglas principales
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-unused-vars': 'error',
'@typescript-eslint/no-floating-promises': 'error',
'@typescript-eslint/explicit-function-return-type': 'warn',
'no-console': ['warn', { allow: ['error', 'warn'] }],

// Arquitectura hexagonal
'no-restricted-imports': ['error', {
  patterns: [{
    group: ['**/infrastructure/**'],
    message: 'No se puede importar desde infrastructure. Usa puertos/interfaces del dominio.'
  }]
}],
```

### Configuración de Prettier

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "overrides": [
    {
      "files": "*.html",
      "options": { "parser": "angular" }
    }
  ]
}
```

### Comandos de Lint

```bash
# Verificar errores
npm run lint

# Corregir automáticamente
npm run lint:fix

# Lint en modo watch (se ejecuta con npm start)
npm run lint:watch
```

## Git Hooks (Husky)

### Hooks Configurados

| Hook | Descripción |
|------|-------------|
| `commit-msg` | Valida formato de mensajes de commit |
| `pre-push` | Ejecuta lint y build antes de push |

### Formato de Commits (Conventional Commits)

```
<tipo>: <Descripción en español>

[Cuerpo opcional en español]

[Footer opcional en español]
```

#### Reglas

| Elemento | Regla |
|----------|-------|
| **Tipo** | Minúsculas, en inglés |
| **Descripción** | Español, puede iniciar con mayúscula |
| **Cuerpo** | Español, sin límite de caracteres |
| **Footer** | Español, sin límite de caracteres |

#### Tipos Permitidos

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
| `chore` | Mantenimiento | `chore: Limpiar archivos temporales` |
| `revert` | Revertir cambios | `revert: Revertir commit abc123` |

#### Ejemplos

```bash
# ✅ Commits válidos
git commit -m "feat: Agregar componente de login"
git commit -m "fix: Corregir validación de correo electrónico"

# Con cuerpo descriptivo
git commit -m "feat: Implementar sistema de notificaciones

Este commit agrega:
- Integración con Firebase Cloud Messaging
- Soporte para notificaciones en segundo plano
- Configuración de permisos

Cierra el issue #45"

# ❌ Commits inválidos
git commit -m "agregando feature"   # No sigue el formato
git commit -m "FEAT: Algo nuevo"    # Tipo en mayúsculas
git commit -m "feat: Add login"     # Descripción en inglés
```

### Validación Pre-Push

Antes de cada `git push` se ejecuta automáticamente:

1. **ESLint**: Valida la calidad del código
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

### Saltarse Validaciones (NO RECOMENDADO)

```bash
# Solo en casos excepcionales (hotfix urgente, emergencias)
git commit --no-verify -m "mensaje"
git push --no-verify
```

## Despliegue

### Build de Producción

```bash
# Compilar para producción
npm run build

# Los archivos se generan en:
# dist/gsti-pwa-empleado/browser/  (archivos estáticos)
# dist/gsti-pwa-empleado/server/   (SSR)
```

### Variables de Entorno de Producción

Configura `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.produccion.com/api',
};
```

### Servidor SSR

```bash
# Ejecutar servidor con Server-Side Rendering
npm run serve:ssr:gsti-pwa-empleado
```

### PWA

La aplicación incluye configuración de PWA con:

- Service Worker para funcionamiento offline
- Manifest para instalación en dispositivos
- Iconos optimizados para diferentes resoluciones

## Flujo de Trabajo Recomendado

```bash
# 1. Crear rama para feature/fix
git checkout -b feat/nueva-funcionalidad

# 2. Desarrollar con servidor y lint en tiempo real
npm start

# 3. Hacer commits frecuentes
git add .
git commit -m "feat: Agregar validación de formulario"

# 4. Verificar antes de push
npm run lint
npm run build

# 5. Push (validaciones automáticas)
git push origin feat/nueva-funcionalidad

# 6. Crear Pull Request
```

## Solución de Problemas

### Errores de Lint

```bash
# Ver todos los errores
npm run lint

# Corregir automáticamente
npm run lint:fix
```

### Errores de Build

```bash
# Compilar y ver errores detallados
npm run build

# Errores comunes:
# - Imports faltantes
# - Variables no usadas
# - Errores de tipo TypeScript
```

### Hooks no funcionan

```bash
# Reinstalar husky
npm run prepare
```

## Recursos Adicionales

- [Angular CLI](https://angular.dev/tools/cli)
- [Angular Style Guide](https://angular.dev/style-guide)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Arquitectura Hexagonal](https://alistair.cockburn.us/hexagonal-architecture/)
- [PrimeNG Components](https://primeng.org/)
