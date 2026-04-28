import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Dr. Khaled Ghattass'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#FAFAFA',
          color: '#0A0A0A',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 22,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#737373',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'inline-block', width: 36, height: 1, background: '#0A0A0A' }} />
          The Official Site
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              fontWeight: 700,
              color: '#0A0A0A',
            }}
          >
            Dr. Khaled Ghattass
          </div>
          <div
            style={{
              fontSize: 30,
              color: '#404040',
              maxWidth: 880,
              lineHeight: 1.4,
            }}
          >
            Cell biologist, expert in human behavior — author, speaker,
            founder of Al-Warsheh.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 20,
            color: '#737373',
          }}
        >
          <span>drkhaledghattass.com</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 999,
              background: '#B85440',
              color: '#FAFAFA',
              fontWeight: 700,
              fontSize: 30,
            }}
          >
            K
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
