import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

// apps/frontend has its own config (apps/frontend/eslint.config.mjs) and is
// linted from that folder, this config is for the NestJS side and the libraries.
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.d.ts',
      'reports/**',
      'uploads/**',
      'chrome_profile*/**',
      // generated on install
      'libraries/plugins/src/plugins.ts',
      'apps/frontend/public/g.js',
    ],
  },
  {
    files: ['apps/backend/**/*.ts', 'apps/orchestrator/**/*.ts', 'libraries/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      // core rules typescript handles itself (same list typescript-eslint ships)
      ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
      ...tsPlugin.configs.recommended.rules,
      // temporal workflows and the provider pollers loop on purpose, only
      // while (true) is exempt, a constant if (false) style condition is still an error
      'no-constant-condition': ['error', { checkLoops: false }],
      // kept off like in the previous root config, the codebase relies on them
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    },
  },
  {
    // workflow files that are already in origin/main are frozen, editing one
    // fails the activities of its running workflows, so their empty catch
    // (errors that are deliberately ignored) is not touched
    files: ['apps/orchestrator/src/workflows/**/*.ts'],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
