import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'out-tsc/**',
      'tmp/**',
      '.angular/**',
      '**/*.spec.ts',
      'src/environments/**',
      'scripts/**',
      'src/assets/firebase-messaging-sw.js'
    ]
  },
  // Configuración base de JavaScript - solo para archivos .js
  {
    files: ['**/*.js'],
    ...js.configs.recommended
  },
  // Configuración de TypeScript - solo para archivos .ts
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended
    ]
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/app.config.ts', '**/app.config.server.ts', 'vite.config.ts'],
    plugins: {
      prettier
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.app.json']
      }
    },
    rules: {
      // Prettier
      'prettier/prettier': 'error',

      // TypeScript strict rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // Arquitectura hexagonal - reglas de importación
      // Solo restringimos infrastructure ya que debe usarse a través de puertos/interfaces
      // La capa de presentación SÍ puede importar casos de uso desde application
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message:
                'No se puede importar desde infrastructure. Usa puertos/interfaces del dominio.'
            }
          ]
        }
      ],

      // Reglas generales
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  // Configuración específica para archivos de configuración (Composition Root)
  // Aquí SÍ se permite importar desde infrastructure para conectar implementaciones con puertos
  {
    files: ['**/app.config.ts', '**/app.config.server.ts'],
    plugins: {
      prettier
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.app.json']
      }
    },
    rules: {
      // Prettier
      'prettier/prettier': 'error',

      // TypeScript strict rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // En archivos de configuración NO se restringe infrastructure
      // Es el Composition Root donde se conectan las implementaciones

      // Reglas generales
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  // Configuración específica para vite.config.ts (sin project para evitar errores)
  {
    files: ['vite.config.ts'],
    plugins: {
      prettier
    },
    languageOptions: {
      parserOptions: {
        // No usar project para vite.config.ts
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // Permitir any en vite.config.ts
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  // Configuración de templates Angular - solo para archivos HTML
  ...angular.configs.templateRecommended.map((config) => ({
    ...config,
    files: ['**/*.html']
  })),
  ...angular.configs.templateAccessibility.map((config) => ({
    ...config,
    files: ['**/*.html']
  })),
  {
    files: ['**/*.html'],
    rules: {
      // Las reglas de accesibilidad ya vienen de angular.configs.templateAccessibility
      // Solo personalizamos algunas
      '@angular-eslint/template/click-events-have-key-events': 'warn',

      // Deshabilitar reglas que requieren atributos en lowercase
      // Angular usa camelCase para directivas y propiedades (ej: [formGroup], formControlName, [@fadeIn])
      '@angular-eslint/template/attributes-order': 'off',

      // Deshabilitar validaciones HTML estándar que no son compatibles con Angular
      // Estas reglas pueden venir de configuraciones recomendadas o plugins HTML
      '@html-eslint/lowercase': 'off',
      '@html-eslint/require-doctype': 'off',
      '@html-eslint/require-img-alt': 'off',
      '@html-eslint/no-self-closing-tag': 'off',
      '@html-eslint/require-button-type': 'off',
      'attribute-name': 'off',
      'html-attribute-name': 'off',
      'vue/html-attribute-name': 'off'
    }
  }
);
