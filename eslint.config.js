import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'images/**',
      'generated/**',
      '.agents/**',
      '.claude/**',
      '.windsurf/**',
      'scratch/**',
    ],
  },
];
