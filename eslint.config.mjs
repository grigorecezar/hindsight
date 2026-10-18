import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierRecommended,
  {
    rules: {
      // Always brace control blocks, even a one line body.
      curly: ['error', 'all'],
      // No else. Invert the condition and return early instead.
      'no-else-return': ['error', { allowElseIf: false }],
      // Spell out `public` on every public member (not the constructor).
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'drizzle/**',
    'next-env.d.ts',
  ]),
])
