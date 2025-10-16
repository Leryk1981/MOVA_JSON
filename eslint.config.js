import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

const typescriptConfig = {
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    globals: {
      ...globals.node,
      ...globals.es2022,
    },
  },
  plugins: {
    '@typescript-eslint': tseslint,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
  },
};

const testOverrides = {
  files: ['**/*.test.ts'],
  languageOptions: {
    ...typescriptConfig.languageOptions,
    globals: {
      ...globals.mocha,
      ...globals.node,
      ...globals.es2022,
    },
  },
};

export default [typescriptConfig, testOverrides];
