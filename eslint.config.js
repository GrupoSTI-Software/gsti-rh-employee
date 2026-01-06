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
      '**/*.spec.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  ...angular.configs.tsRecommended,
  ...angular.configs.templateRecommended,
  ...angular.configs.templateAccessibility,
  {
    files: ['**/*.ts'],
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
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // Arquitectura hexagonal - reglas de importación
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message:
                'No se puede importar desde infrastructure. Usa puertos/interfaces del dominio.'
            },
            {
              group: ['**/application/**'],
              message:
                'No se puede importar desde application directamente. Usa los casos de uso.'
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
  {
    files: ['**/*.html'],
    rules: {
      // Reglas de accesibilidad de Angular
      '@angular-eslint/template/accessibility-alt-text': 'error',
      '@angular-eslint/template/accessibility-elements-content': 'error',
      '@angular-eslint/template/accessibility-label-has-associated-control':
        'error',
      '@angular-eslint/template/accessibility-table-scope': 'error',
      '@angular-eslint/template/accessibility-valid-aria': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/no-positive-tabindex': 'error',

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

