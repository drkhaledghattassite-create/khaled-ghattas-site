import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      'components/ui/**',
      'lib/db/migrations/**',
      // PDF.js worker bundle copied into public/ for the in-browser PDF
      // reader (Phase 2). The worker is shipped minified by upstream and
      // is never edited here — linting it produces ~1500 noise warnings
      // that bury real signal.
      'public/pdf.worker.min.mjs',
    ],
  },
]

export default eslintConfig
