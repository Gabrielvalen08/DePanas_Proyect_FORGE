import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.strict.rules,
      'react/prop-types': 'off',
      // Prohíbe style={{}}: los estilos van en CSS Modules
      'react/forbid-dom-props': ['error', { forbid: ['style'] }],
    },
  },
  {
    // api.js no se modifica: BASE_URL solo se usa en los fetch comentados
    files: ['src/services/api.js'],
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^BASE_URL$' }] },
  },
]
