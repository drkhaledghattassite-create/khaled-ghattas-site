import { ImageResponse } from 'next/og'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'
export const alt = 'Dr. Khaled Ghattass'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const logoBase64 = fs
  .readFileSync(path.join(process.cwd(), 'public', 'logo-black.png'))
  .toString('base64')
const logoSrc = `data:image/png;base64,${logoBase64}`

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          background: '#EDE7DF',
          color: '#252321',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '72px 64px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 20,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#66615A',
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', width: 36, height: 1, background: '#BC884A' }} />
            <span style={{ display: 'flex' }}>The Official Site</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                fontSize: 88,
                lineHeight: 1.04,
                letterSpacing: '-0.02em',
                fontWeight: 700,
                color: '#252321',
              }}
            >
              Dr. Khaled Ghattass
            </div>
            <div
              style={{
                fontSize: 26,
                color: '#66615A',
                maxWidth: 540,
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
              fontSize: 20,
              color: '#66615A',
            }}
          >
            <span>drkhaledghattass.com</span>
            <span style={{ color: '#BC884A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
            background: '#F6F4F1',
            borderInlineStart: '1px solid rgba(37, 35, 33, 0.08)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
          />
        </div>
      </div>
    ),
    { ...size },
  )
}
