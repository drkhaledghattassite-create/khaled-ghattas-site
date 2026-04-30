// Generates branded icons from public/logo-black.png.
// Outputs:
//   app/icon.png         (32x32, served at /icon)
//   app/apple-icon.png   (180x180, served at /apple-icon)
//   app/favicon.ico      (16/32/48 multi-res, served at /favicon.ico)
//   public/icon-192.png  (PWA manifest)
//   public/icon-512.png  (PWA manifest)
//   public/icon-maskable.png (Android maskable, 512 with safe-area padding)
//
// Run:  node scripts/gen-icons.mjs

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const LOGO = path.join(ROOT, 'public', 'logo-black.png')
const APP_DIR = path.join(ROOT, 'app')
const PUBLIC_DIR = path.join(ROOT, 'public')

// Brand cream — matches design tokens in CLAUDE.md.
const CREAM = { r: 0xed, g: 0xe7, b: 0xdf, alpha: 1 }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

async function brandedPng(size, paddingPct, { background = CREAM } = {}) {
  const innerSize = Math.max(1, Math.round(size * (1 - paddingPct * 2)))

  // Trim transparent edges so the logo fills the safe area.
  const trimmed = await sharp(LOGO).trim().toBuffer()
  const meta = await sharp(trimmed).metadata()
  const aspect = (meta.width ?? 1) / (meta.height ?? 1)

  let w
  let h
  if (aspect >= 1) {
    w = innerSize
    h = Math.max(1, Math.round(innerSize / aspect))
  } else {
    h = innerSize
    w = Math.max(1, Math.round(innerSize * aspect))
  }

  const logo = await sharp(trimmed)
    .resize({ width: w, height: h, fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()

  const left = Math.round((size - w) / 2)
  const top = Math.round((size - h) / 2)

  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toBuffer()
}

// Builds a multi-resolution .ico containing the given PNG buffers.
// Format: 6-byte ICONDIR + N*16-byte ICONDIRENTRY + concatenated PNG data.
function buildIco(entries) {
  const count = entries.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = ICO
  header.writeUInt16LE(count, 4)

  const directory = Buffer.alloc(count * 16)
  let offset = 6 + count * 16

  entries.forEach((entry, i) => {
    const o = i * 16
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, o) // width
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, o + 1) // height
    directory.writeUInt8(0, o + 2) // colors (0 = >=256)
    directory.writeUInt8(0, o + 3) // reserved
    directory.writeUInt16LE(1, o + 4) // planes
    directory.writeUInt16LE(32, o + 6) // bits per pixel
    directory.writeUInt32LE(entry.buffer.length, o + 8) // image size
    directory.writeUInt32LE(offset, o + 12) // image offset
    offset += entry.buffer.length
  })

  return Buffer.concat([header, directory, ...entries.map((e) => e.buffer)])
}

async function main() {
  if (!fs.existsSync(LOGO)) {
    throw new Error(`Logo not found: ${LOGO}`)
  }

  // Tab/browser favicons (small) — minimal padding so the logo reads at tiny sizes.
  const png16 = await brandedPng(16, 0.0)
  const png32 = await brandedPng(32, 0.02)
  const png48 = await brandedPng(48, 0.03)

  // iOS home screen.
  const apple180 = await brandedPng(180, 0.05)

  // PWA manifest icons.
  const png192 = await brandedPng(192, 0.05)
  const png512 = await brandedPng(512, 0.06)

  // Maskable icon: Android crops to 80% diameter circle; keep ~17.5% padding so the
  // logo still feels prominent without being clipped.
  const maskable512 = await brandedPng(512, 0.17)

  // Next.js auto-serves these via filename convention.
  fs.writeFileSync(path.join(APP_DIR, 'icon.png'), png32)
  fs.writeFileSync(path.join(APP_DIR, 'apple-icon.png'), apple180)

  // Multi-resolution favicon for legacy clients.
  const ico = buildIco([
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 },
    { size: 48, buffer: png48 },
  ])
  fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), ico)

  // PWA icons referenced in app/manifest.ts.
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-192.png'), png192)
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-512.png'), png512)
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-maskable.png'), maskable512)

  console.log('Wrote:')
  console.log('  app/icon.png            (32x32)')
  console.log('  app/apple-icon.png      (180x180)')
  console.log('  app/favicon.ico         (16/32/48)')
  console.log('  public/icon-192.png     (192x192)')
  console.log('  public/icon-512.png     (512x512)')
  console.log('  public/icon-maskable.png (512x512, safe-area)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
