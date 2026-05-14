import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts')

// QA P1 — Content-Security-Policy. Locks XSS impact by restricting what the
// browser is allowed to load. Built as a single header here (rather than
// computed per-route) so static pages and dynamic SSR share the same policy.
//
// Allowlist rationale per directive:
//   default-src 'self'                       — fall-through; everything else is
//                                              an explicit override below.
//   script-src                               — Next.js inlines runtime + RSC
//                                              chunks (require 'self'); Stripe
//                                              Checkout overlay (js.stripe.com);
//                                              Vercel analytics + speed-insights
//                                              (va.vercel-scripts.com).
//                                              'unsafe-inline' is needed for
//                                              Next.js's `__next_f` inline
//                                              chunks until we adopt nonces.
//                                              In DEV ONLY we also allow
//                                              'unsafe-eval' because Next.js
//                                              React Refresh applies hot updates
//                                              via eval. Production keeps it
//                                              locked.
//   style-src                                — Tailwind compiles to a single
//                                              stylesheet (self), but next/font
//                                              + motion/react use inline styles.
//   img-src                                  — same hosts as next/image
//                                              remotePatterns + data: for inline
//                                              icons + blob: for canvas captures.
//   font-src                                 — Google Fonts (gstatic.com).
//   frame-src                                — Stripe Checkout iframes + YouTube
//                                              embeds (interview videos).
//   connect-src                              — Better Auth, Stripe API, Resend
//                                              audit pings, Vercel analytics.
//                                              In DEV ONLY we add ws://localhost
//                                              and http://localhost so HMR
//                                              websockets + dev-server fetches
//                                              aren't blocked.
//   frame-ancestors 'none'                   — paired with the X-Frame-Options
//                                              DENY above; CSP supersedes XFO.
//   form-action 'self' https://checkout.stripe.com — Stripe Checkout posts
//                                              back to our domain via Vercel
//                                              redirects; explicit allow.
//   base-uri 'self'                          — prevents <base> tag tampering.
//   upgrade-insecure-requests                — http:// hardlinks auto-upgrade.
//                                              Omitted in DEV so localhost http://
//                                              isn't rewritten to https://.
const isDev = process.env.NODE_ENV !== 'production'

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com"
  : "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com"

const connectSrc = isDev
  ? "connect-src 'self' ws://localhost:* http://localhost:* https://api.stripe.com https://checkout.stripe.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com"
  : "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com"

const cspDirectives = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://files.stripe.com https://lh3.googleusercontent.com https://img.youtube.com https://i.ytimg.com https://*.vimeocdn.com https://ik.imagekit.io https://utfs.io",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  connectSrc,
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "base-uri 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Content-Security-Policy', value: cspDirectives },
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
  // Keep webpack's persistent cache (.next/cache/webpack — ~460 MB on this
  // project) OUT of serverless function bundles. Without this exclude, every
  // function ships ~467 MB of dependencies, the deploy phase hits the function-
  // size warning, and the upload phase takes ~17 min and tends to ERROR.
  outputFileTracingExcludes: {
    '*': ['.next/cache/**', 'node_modules/@next/swc-*/**'],
  },
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
