import js from '@eslint/js'
import globals from 'globals'
import ts from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import { importX } from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import reactRefresh from 'eslint-plugin-react-refresh'
import perfectionist from 'eslint-plugin-perfectionist'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig(
  globalIgnores(['**/dist/', '**/node_modules/']),
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended],
    plugins: { prettier, perfectionist, import: importX },
    rules: {
      'import/first': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'arrow-body-style': 'error',
      'prettier/prettier': 'error',
      'import/newline-after-import': 'error',
      'perfectionist/sort-objects': [
        'error',
        { order: 'asc', type: 'line-length' },
      ],
      'perfectionist/sort-exports': [
        'error',
        { order: 'asc', type: 'line-length' },
      ],
      'perfectionist/sort-jsx-props': [
        'error',
        { order: 'asc', type: 'line-length' },
      ],
      'perfectionist/sort-interfaces': [
        'error',
        { order: 'asc', type: 'line-length' },
      ],
      'perfectionist/sort-object-types': [
        'error',
        { order: 'asc', type: 'line-length' },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        { order: 'asc', type: 'line-length' },
      ],
      'perfectionist/sort-named-exports': [
        'error',
        { order: 'asc', type: 'line-length' },
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          order: 'asc',
          newlinesBetween: 1,
          type: 'line-length',
          internalPattern: ['^@/'],
          groups: [
            ['type-builtin', 'value-builtin'],
            ['type-external', 'value-external'],
            ['type-internal', 'value-internal', 'tsconfig-path'],
            [
              'type-parent',
              'type-index',
              'value-index',
              'type-sibling',
              'value-parent',
              'value-sibling',
            ],
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [ts.configs.recommended],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactRefresh.configs.vite, reactHooks.configs.flat.recommended],
  },
  {
    files: ['*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },
  prettierConfig,
  { rules: { curly: 'error' } },
)
