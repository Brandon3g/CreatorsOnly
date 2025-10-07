import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

const typescriptRules = tseslint.configs.recommended.rules ?? {};
const reactHooksRules = reactHooks.configs.recommended.rules ?? {};

export default [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      ...typescriptRules,
      ...reactHooksRules,
    },
  },
  {
    ignores: ['dist', 'node_modules'],
  },
];