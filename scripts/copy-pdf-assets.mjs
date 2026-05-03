// Copies pdfjs-dist runtime assets from node_modules into public/ so the
// PdfReader can serve them at /pdf.worker.min.mjs, /cmaps/, and
// /standard_fonts/ at runtime.
//
// Why we don't ship these in git:
//   - They're 186+ binary files (~7MB) regenerated on every dependency
//     bump. Committing them turns every `npm install pdfjs-dist@x.y.z`
//     into a noisy diff.
//   - They MUST match the installed pdfjs-dist version exactly. Hand-
//     copying drifts silently — version skew between worker and library
//     manifests as cryptic runtime crashes ("Setting up fake worker
//     failed", glyph rendering bugs).
//
// This script is wired into the `postinstall` npm hook, so `npm install`
// (locally and on Netlify CI) auto-syncs them after every dependency
// install. The corresponding paths in /public are gitignored.
//
// Run manually:  node scripts/copy-pdf-assets.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PDFJS = path.join(ROOT, 'node_modules', 'pdfjs-dist')
const PUBLIC_DIR = path.join(ROOT, 'public')

// pdfjs-dist not installed yet (e.g. fresh clone before `npm install`
// finishes wiring node_modules). Skip silently — the postinstall hook
// fires after install completes, so the directory will exist by then.
if (!fs.existsSync(PDFJS)) {
  console.log('[copy-pdf-assets] pdfjs-dist not installed yet; skipping.')
  process.exit(0)
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0
  fs.mkdirSync(dest, { recursive: true })
  let count = 0
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) count += copyDir(s, d)
    else if (entry.isFile()) {
      fs.copyFileSync(s, d)
      count += 1
    }
  }
  return count
}

// 1. Worker (single file). We copy the LEGACY worker, not build/pdf.worker.min.mjs,
// because next.config.ts aliases `pdfjs-dist` to the legacy library build
// (the modern build crashes Webpack — see the comment in next.config.ts).
// PDF.js requires the worker and library API to be the same build flavor;
// a modern worker against a legacy library produces silent runtime errors.
const workerSrc = path.join(PDFJS, 'legacy', 'build', 'pdf.worker.min.mjs')
const workerDest = path.join(PUBLIC_DIR, 'pdf.worker.min.mjs')
if (fs.existsSync(workerSrc)) {
  copyFile(workerSrc, workerDest)
  console.log('[copy-pdf-assets] legacy worker -> /pdf.worker.min.mjs')
} else {
  console.warn(`[copy-pdf-assets] missing ${workerSrc}`)
}

// 2. cMaps (character maps for non-Latin scripts: Arabic, CJK, etc.)
const cmapsCount = copyDir(
  path.join(PDFJS, 'cmaps'),
  path.join(PUBLIC_DIR, 'cmaps'),
)
console.log(`[copy-pdf-assets] cmaps -> /cmaps/ (${cmapsCount} files)`)

// 3. Standard fonts (used when a PDF references built-in PostScript fonts).
const fontsCount = copyDir(
  path.join(PDFJS, 'standard_fonts'),
  path.join(PUBLIC_DIR, 'standard_fonts'),
)
console.log(`[copy-pdf-assets] standard_fonts -> /standard_fonts/ (${fontsCount} files)`)
