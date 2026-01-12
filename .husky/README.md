# Configuración de Husky

Este proyecto usa Husky para ejecutar git hooks que garantizan la calidad del código.

## Hooks Configurados

### commit-msg
Valida que los mensajes de commit sigan el estándar de **Conventional Commits**.

#### Formato requerido:
```
<tipo>: <Descripción en español>

[Cuerpo opcional en español - sin límite de caracteres]

[Nota al pie opcional en español]
```

#### Reglas:
- ✅ El **tipo** debe estar siempre en **minúsculas** y en **inglés**
- ✅ La **descripción** puede iniciar con mayúscula
- ✅ El **cuerpo** y **footer** pueden tener cualquier formato y sin límite de longitud
- ✅ Todo el mensaje (excepto el tipo) debe estar en **español**

#### Tipos permitidos (en inglés y minúsculas):
- `feat`: Nueva funcionalidad
- `fix`: Corrección de errores
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan código)
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Añadir o modificar tests
- `build`: Cambios en el sistema de build o dependencias
- `ci`: Cambios en CI/CD
- `chore`: Tareas de mantenimiento
- `revert`: Revertir un commit anterior

#### Ejemplos válidos:
```bash
git commit -m "feat: Agregar componente de login"
git commit -m "fix: Corregir error en validación de formulario"
git commit -m "docs: Actualizar README con instrucciones de instalación"
git commit -m "refactor: Mejorar estructura del servicio de autenticación"

# Con cuerpo descriptivo (sin límite de caracteres)
git commit -m "feat: Implementar módulo de reportes

Este commit agrega el módulo completo de reportes con las siguientes características:
- Generación de reportes en PDF
- Exportación a Excel
- Filtros por fecha, departamento y empleado
- Gráficos interactivos con Chart.js

Se agregaron pruebas unitarias para todos los servicios nuevos."
```

#### Ejemplos inválidos:
```bash
git commit -m "agregando feature"  # ❌ No sigue el formato tipo: descripción
git commit -m "FEAT: Algo nuevo"   # ❌ El tipo debe ser en minúsculas
git commit -m "feature: Nuevo"     # ❌ Tipo no permitido (usar feat)
git commit -m "Feat: Algo"         # ❌ El tipo debe ser completamente en minúsculas
```

### pre-push
Antes de permitir un `git push`, ejecuta:

1. **Lint**: Valida que el código cumpla con las reglas de ESLint
2. **Build**: Compila el proyecto para asegurar que no hay errores de compilación

Si alguna de estas validaciones falla, el push será rechazado.

## Instalación para nuevos desarrolladores

Cuando clones el repositorio, ejecuta:

```bash
npm install
```

Esto instalará las dependencias y configurará automáticamente los hooks de Husky gracias al script `prepare`.

## Saltarse los hooks (NO RECOMENDADO)

En casos excepcionales, puedes saltarte los hooks con:

```bash
git commit --no-verify -m "mensaje"
git push --no-verify
```

⚠️ **Nota**: Esto NO es recomendado ya que puede introducir código con errores al repositorio.
