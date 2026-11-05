// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import angularPlugin from 'angular-eslint';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.html'],
    plugins: {
      '@angular-eslint': angularPlugin,
    },
    processor: angularPlugin.processInlineTemplates,
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.angular/**',
      'src/**/*.html',
      'src/app/features/login/**',
      'src/app/shared/components/validador-citas/**',
      'src/app/shared/components/file-dropzone/**',
      'src/app/shared/components/login/**',
      'src/app/shared/lib/services/user.service.ts',
    ],
  },
];
