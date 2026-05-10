import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

// SECURITY [H-3]: `remotePatterns` was previously `[{ hostname: '**' }]`,
// which let `/_next/image?url=...` proxy any HTTPS host. That's an SSRF-
// adjacent vector AND a free bandwidth/cost amplifier (anyone can route
// large external images through our edge). Lock to the hosts we actually
// use. When adding a new image source (Uploadthing wiring, marketing assets
// from a new CDN, etc.), add the host here — do NOT revert to '**'.
type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number]

const remotePatterns: RemotePattern[] = [
  // Stripe-hosted product images (book covers in Stripe Checkout previews)
  { protocol: 'https', hostname: 'files.stripe.com' },

  // Google profile images (OAuth avatar)
  { protocol: 'https', hostname: 'lh3.googleusercontent.com' },

  // YouTube thumbnails (interview videos)
  { protocol: 'https', hostname: 'img.youtube.com' },
  { protocol: 'https', hostname: 'i.ytimg.com' },

  // Vimeo thumbnails (interview videos)
  { protocol: 'https', hostname: '*.vimeocdn.com' },

  // ImageKit (planned migration target for content imagery)
  { protocol: 'https', hostname: 'ik.imagekit.io' },

  // Uploadthing (Phase 5D — image upload pipeline)
  { protocol: 'https', hostname: 'utfs.io' },
]

if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const ownHost = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    remotePatterns.push({ protocol: 'https', hostname: ownHost })
  } catch {
    // Malformed NEXT_PUBLIC_APP_URL — skip the dynamic entry, keep the static
    // allowlist. This branch is hit at build time on Vercel when the env var
    // is set wrong; we'd rather build with a partial allowlist than crash.
  }
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns,
  },
  // Hide the floating "N issues" / build-activity badge in dev — it stamps
  // every screenshot and serves no production purpose.
  devIndicators: false,
  // PDF.js (via react-pdf) ships an optional `canvas` import for Node-side
  // rendering. We never render PDFs server-side — the reader is a client
  // component and the worker runs in a Web Worker. Aliasing canvas → false
  // prevents the Node bundle from trying to resolve the native module
  // during the App Router's RSC pass and unblocks serverless-style builds.
  // See node_modules/pdfjs-dist/types/src/display/api.d.ts.
  //
  // pdfjs-dist@5's modern build (`build/pdf.mjs`, the package's `"main"`)
  // contains top-level ESM constructs that Webpack 5 cannot wrap correctly
  // — `__webpack_require__.r(exports)` is called with a non-object and
  // crashes ("Object.defineProperty called on non-object") at module
  // evaluation. The legacy build at `legacy/build/pdf.mjs` is the same
  // library transpiled to a shape Webpack handles. We alias the bare
  // specifier with `$` (exact-match) so this only affects react-pdf's
  // `import 'pdfjs-dist'` — sub-path imports like `pdfjs-dist/build/
  // pdf.worker.min.mjs` (used by scripts/copy-pdf-assets.mjs) are
  // unaffected.
  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
      'pdfjs-dist$': 'pdfjs-dist/legacy/build/pdf.mjs',
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Mock storage serves PDFs at same-origin paths; the global DENY above
      // would block the PdfInline iframe from loading them in dev. Override to
      // SAMEORIGIN for this prefix only. In production the real storage adapter
      // returns external CDN URLs that never see our app's X-Frame-Options.
      {
        source: '/placeholder-content/:path*',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
