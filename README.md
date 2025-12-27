# GstiPwaEmpleado

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Arquitectura del Proyecto

Este proyecto utiliza **Arquitectura Hexagonal (Ports and Adapters)** combinada con **Vertical Slicing** por módulos. Esta arquitectura proporciona una separación clara de responsabilidades y facilita el mantenimiento y escalabilidad del código.

### Estructura de Módulos

Cada módulo de negocio (como `auth`, `attendance`, `system-settings`) sigue la misma estructura interna:

```
modules/
  └── nombre-modulo/
      ├── domain/          # Capa de dominio (interfaces, contratos)
      │   ├── *.port.ts    # Puerto (interfaz) que define el contrato
      │   └── *.token.ts   # InjectionToken para Angular DI
      ├── application/     # Casos de uso (lógica de negocio)
      │   └── *.use-case.ts
      ├── infrastructure/  # Adaptadores (implementaciones concretas)
      │   └── http-*.adapter.ts
      └── presentation/    # Componentes UI (vistas)
          └── *.component.ts
```

### ¿Por qué Arquitectura Hexagonal por Módulo?

En lugar de tener una estructura plana como:

```
❌ Estructura plana (NO recomendada)
app/
  ├── domain/
  │   ├── auth.port.ts
  │   ├── attendance.port.ts
  │   └── system-settings.port.ts
  ├── application/
  │   ├── login.use-case.ts
  │   └── get-attendance.use-case.ts
  ├── infrastructure/
  │   ├── http-auth.adapter.ts
  │   └── http-attendance.adapter.ts
  └── presentation/
      ├── login.component.ts
      └── checkin.component.ts
```

Optamos por una **estructura modular vertical** porque:

1. **Encapsulación**: Cada módulo contiene todo lo relacionado con su dominio (domain, application, infrastructure, presentation) en un solo lugar, facilitando la comprensión y mantenimiento.

2. **Escalabilidad**: Cuando el proyecto crece, es más fácil encontrar y modificar código relacionado. No necesitas buscar en múltiples carpetas generales.

3. **Independencia**: Los módulos pueden evolucionar independientemente. Puedes cambiar la implementación de un módulo sin afectar otros.

4. **Claridad**: Un desarrollador nuevo puede entender rápidamente qué hace un módulo viendo su estructura completa.

5. **Reutilización**: Si necesitas extraer un módulo completo a otra aplicación, solo copias la carpeta del módulo.

### Inyección de Dependencias y Arquitectura Hexagonal

#### Flujo de Inyección de Dependencias

La arquitectura hexagonal utiliza **InjectionTokens** de Angular para desacoplar las interfaces (puertos) de sus implementaciones (adaptadores). Aquí te explicamos cómo funciona:

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
│    "Necesito algo que cumpla con AuthPort (interfaz)"      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Angular Dependency Injection                             │
│    "Alguien pidió AUTH_PORT..."                            │
│    ↓                                                         │
│    "Busco en app.config.ts..."                             │
│    ↓                                                         │
│    "Encontré: provide: AUTH_PORT, useClass: HttpAuthAdapter"│
│    ↓                                                         │
│    "Creo una instancia de HttpAuthAdapter"                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Adaptador (Infrastructure Layer)                        │
│    export class HttpAuthAdapter implements AuthPort ✅      │
│    ↓                                                         │
│    "Soy la implementación concreta"                        │
│    "Tengo el método login() que hace HTTP real"            │
└─────────────────────────────────────────────────────────────┘
```

#### Ejemplo Práctico

**1. Definición del Puerto (Interfaz) - `domain/auth.port.ts`**
```typescript
export interface AuthPort {
  login(email: string, password: string, deviceInfo?: DeviceInfo): Promise<AuthResult>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getCurrentUser(): User | null;
}
```

**2. Token de Inyección - `domain/auth.token.ts`**
```typescript
export const AUTH_PORT = new InjectionToken<AuthPort>('AuthPort');
```

**3. Caso de Uso - `application/login.use-case.ts`**
```typescript
export class LoginUseCase {
  private readonly authPort = inject(AUTH_PORT); // ← Pide la interfaz, no la clase
  
  async execute(email: string, password: string): Promise<AuthResult> {
    return this.authPort.login(email, password, deviceInfo);
  }
}
```

**4. Configuración del Provider - `app.config.ts`**
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: AUTH_PORT,        // ← Token/Interfaz que se pide
      useClass: HttpAuthAdapter   // ← Clase concreta que se inyecta
    }
  ]
};
```

**5. Implementación del Adaptador - `infrastructure/http-auth.adapter.ts`**
```typescript
export class HttpAuthAdapter implements AuthPort {
  async login(...): Promise<AuthResult> {
    // Implementación concreta usando HttpClient
  }
}
```

#### Ventajas de esta Arquitectura

1. **Desacoplamiento**: `LoginUseCase` no conoce `HttpAuthAdapter`, solo conoce la interfaz `AuthPort`.

2. **Testeable**: Puedes crear un mock de `AuthPort` para pruebas sin necesidad de hacer llamadas HTTP reales:
   ```typescript
   {
     provide: AUTH_PORT,
     useClass: MockAuthAdapter // ← En tests
   }
   ```

3. **Intercambiable**: Puedes cambiar la implementación sin modificar el caso de uso:
   ```typescript
   // Cambiar de HTTP a GraphQL solo modificando app.config.ts
   {
     provide: AUTH_PORT,
     useClass: GraphQLAuthAdapter // ← Nueva implementación
   }
   ```

4. **Mantenible**: Cada capa tiene responsabilidades claras:
   - **Domain**: Define qué se necesita (contratos)
   - **Application**: Orquesta la lógica de negocio
   - **Infrastructure**: Implementa cómo se hace (HTTP, WebSocket, etc.)
   - **Presentation**: Muestra la información al usuario

### ¿Cuándo Necesitas InjectionTokens?

Los **InjectionTokens** son necesarios cuando trabajas con **interfaces** en Angular. Aquí te explicamos cuándo usarlos y cuándo no:

#### ❌ NO Necesitas InjectionToken (Inyectar Clases Directamente)

Cuando inyectas una **clase directamente**, Angular puede resolverla automáticamente:

```typescript
// ✅ SIN InjectionToken - Inyectando una CLASE directamente
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // ...
}

// En otro componente:
export class LoginComponent {
  private readonly theme = inject(ThemeService); // ← Clase directamente
}
```

**¿Por qué funciona?** Angular puede identificar la clase `ThemeService` en tiempo de ejecución porque es una clase real de JavaScript.

#### ✅ SÍ Necesitas InjectionToken (Inyectar Interfaces)

Cuando quieres inyectar una **interfaz**, necesitas un InjectionToken porque las interfaces no existen en JavaScript:

```typescript
// ❌ ESTO NO FUNCIONA - Las interfaces no existen en JavaScript
export interface AuthPort {
  login(...): Promise<AuthResult>;
}

export class LoginUseCase {
  private authPort = inject(AuthPort); // ❌ ERROR: AuthPort no existe en runtime
}
```

**¿Por qué no funciona?** TypeScript elimina las interfaces al compilar a JavaScript. En tiempo de ejecución, `AuthPort` no existe.

**Solución con InjectionToken:**

```typescript
// ✅ CON InjectionToken - Inyectando una INTERFAZ
export interface AuthPort {
  login(...): Promise<AuthResult>;
}

// Crear el token que "representa" la interfaz
export const AUTH_PORT = new InjectionToken<AuthPort>('AuthPort');

// En el caso de uso:
export class LoginUseCase {
  private readonly authPort = inject(AUTH_PORT); // ✅ Funciona!
}
```

#### Comparación Visual

```
┌─────────────────────────────────────────────────────────┐
│ INYECTAR CLASE (NO necesita Token)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ThemeService (clase)                                   │
│    ↓                                                     │
│  inject(ThemeService) ✅                                │
│                                                          │
│  Angular puede encontrar ThemeService porque es una     │
│  clase real de JavaScript                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ INYECTAR INTERFAZ (SÍ necesita Token)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  AuthPort (interfaz) → NO EXISTE en JavaScript         │
│    ↓                                                     │
│  AUTH_PORT (InjectionToken) → SÍ EXISTE en JavaScript   │
│    ↓                                                     │
│  inject(AUTH_PORT) ✅                                   │
│                                                          │
│  El Token es la "llave" que Angular usa para encontrar │
│  la implementación (HttpAuthAdapter)                   │
└─────────────────────────────────────────────────────────┘
```

#### Tabla de Referencia Rápida

| Escenario | ¿Necesitas Token? | Ejemplo |
|-----------|-------------------|---------|
| Inyectar una clase directamente | ❌ NO | `inject(ThemeService)` |
| Inyectar una interfaz | ✅ SÍ | `inject(AUTH_PORT)` |
| Arquitectura hexagonal (puertos) | ✅ SÍ | Siempre, porque usas interfaces |
| Servicios simples sin abstracción | ❌ NO | `inject(DeviceService)` |

#### En Arquitectura Hexagonal: Siempre Necesitas InjectionToken

En arquitectura hexagonal siempre usas **interfaces (puertos)**, no clases concretas, por lo que **siempre necesitas InjectionTokens**:

```typescript
// 1. Definir el PUERTO (interfaz)
export interface AuthPort {
  login(...): Promise<AuthResult>;
}

// 2. Crear el TOKEN (necesario para Angular)
export const AUTH_PORT = new InjectionToken<AuthPort>('AuthPort');

// 3. Implementar el ADAPTADOR (clase concreta)
export class HttpAuthAdapter implements AuthPort {
  // implementación...
}

// 4. Configurar el PROVIDER (conectar token → implementación)
{
  provide: AUTH_PORT,        // ← Token (representa la interfaz)
  useClass: HttpAuthAdapter   // ← Clase concreta
}

// 5. Usar en el CASO DE USO
export class LoginUseCase {
  private authPort = inject(AUTH_PORT); // ← Pide el token
}
```

**Conclusión**: El InjectionToken es la forma de Angular de decir: *"Cuando alguien pida este token, dale esta implementación concreta"*. Es el puente entre la interfaz (que no existe en runtime) y la clase concreta (que sí existe).

### Módulos Actuales

- **auth**: Autenticación y gestión de sesión de usuario
- **attendance**: Registro de asistencia (check-in/check-out)
- **system-settings**: Configuración del sistema y branding dinámico
- **dashboard**: Layout principal de la aplicación
- **profile**: Perfil del usuario
- **settings**: Configuración de la aplicación
- **biometrics**: Configuración de autenticación biométrica

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
