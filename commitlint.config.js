export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos (siempre en minúsculas/inglés)
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nueva funcionalidad
        'fix', // Corrección de errores
        'docs', // Cambios en documentación
        'style', // Cambios de formato (no afectan código)
        'refactor', // Refactorización de código
        'perf', // Mejoras de rendimiento
        'test', // Añadir o modificar tests
        'build', // Cambios en el sistema de build o dependencias
        'ci', // Cambios en CI/CD
        'chore', // Tareas de mantenimiento
        'revert', // Revertir un commit anterior
      ],
    ],

    // El type debe ser siempre en minúsculas
    'type-case': [2, 'always', 'lower-case'],

    // Permitir cualquier formato en el subject (mayúsculas, minúsculas, etc.)
    'subject-case': [0],

    // Sin límite en el body del commit
    'body-max-line-length': [0],

    // Sin límite en el footer del commit
    'footer-max-line-length': [0],

    // Sin límite en el header (línea principal del commit)
    'header-max-length': [0],
  },
};
