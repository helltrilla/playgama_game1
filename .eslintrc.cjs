module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Playgama compliance: localStorage / sessionStorage / indexedDB / cookies strictly forbidden in source
    'no-restricted-globals': [
      'error',
      { name: 'localStorage', message: 'localStorage is strictly forbidden by Playgama requirements. Use bridge.storage instead.' },
      { name: 'sessionStorage', message: 'sessionStorage is strictly forbidden by Playgama requirements. Use bridge.storage instead.' },
      { name: 'indexedDB', message: 'indexedDB is forbidden. Use bridge.storage instead.' },
    ],
    'no-restricted-properties': [
      'error',
      { object: 'document', property: 'cookie', message: 'Cookies are strictly forbidden by Playgama requirements.' },
      { object: 'window', property: 'localStorage', message: 'localStorage is strictly forbidden. Use bridge.storage instead.' },
      { object: 'window', property: 'sessionStorage', message: 'sessionStorage is strictly forbidden. Use bridge.storage instead.' },
      { object: 'window', property: 'indexedDB', message: 'indexedDB is forbidden. Use bridge.storage instead.' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Core layer cannot import from three, DOM, platform, scene, or ui (ARCHITECTURE.md)
      files: ['src/core/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'three', message: 'Core layer must not depend on three.js' },
            ],
            patterns: [
              { group: ['../scene/**', '../ui/**', '../platform/**', '../audio/**', '../app/**'], message: 'Core layer must not import outer layers' },
            ],
          },
        ],
      },
    },
  ],
};
