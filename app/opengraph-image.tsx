import { ImageResponse } from 'next/og'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'
export const alt = 'Dr. Khaled Ghattass'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// next/og (Satori) ships with Latin glyph coverage only. Rendering Arabic
// text would require fetching an Arabic font (e.g. Noto Naskh Arabic) at
// build time and passing it via ImageResponse({ fonts }). Until that font
// pipeline is set up, the OG image stays Latin-only — social platforms
// localize the surrounding card via og:locale, og:title, og:description.

// Read the logo at module load. Wrapped so a missing file doesn't crash OG
// image generation for every page on the site — without this guard a single
// rename or deploy artifact mishap blanks every social-share preview.
function loadLogoSrc(): string | null {
  try {
    const buf = fs.readFileSync(
      path.join(process.cwd(), 'public', 'logo-black.png'),
    )
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

const logoSrc = loadLogoSrc()

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          background: '#FAFAFA',
          color: '#0A0A0A',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 56px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 18,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#737373',
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', width: 36, height: 1, background: '#B85440' }} />
            <span style={{ display: 'flex' }}>The Official Site</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 84,
                lineHeight: 1.04,
                letterSpacing: '-0.02em',
                fontWeight: 700,
                color: '#0A0A0A',
              }}
            >
              Dr. Khaled Ghattass
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                color: '#404040',
                maxWidth: 560,
                lineHeight: 1.4,
              }}
            >
              Cell biologist and expert in human behavior — author, speaker, founder of Al-Warsheh.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 18,
              color: '#737373',
            }}
          >
            <span>drkhaledghattass.com</span>
            <span style={{ color: '#B85440', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Burja · Lebanon
            </span>
          </div>
        </div>

        <div
          style={{
            width: 480,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 56,
            background: '#F4F4F4',
            borderInlineStart: '1px solid rgba(10, 10, 10, 0.08)',
          }}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            />
          ) : (
            <span
              style={{
                display: 'flex',
                fontSize: 80,
                fontWeight: 700,
                color: '#0A0A0A',
                letterSpacing: '-0.02em',
              }}
            >
              KG
            </span>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
