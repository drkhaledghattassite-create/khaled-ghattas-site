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

// Phase F2 — Cloudflare R2 hosts. AWS SDK v3 with forcePathStyle:false (our
// adapter setting) issues VIRTUAL-HOST-style URLs:
//   https://<bucket>.<account-id>.r2.cloudflarestorage.com/<key>?<signed>
// CSP doesn't match subdomains unless explicitly wildcarded, so we need
// BOTH entries:
//   1. https://<account-id>.r2.cloudflarestorage.com  — path-style / List ops
//   2. https://*.<account-id>.r2.cloudflarestorage.com — bucket-subdomain
//      virtual-host where the signed PUT/GET URLs actually live.
// When R2_ACCOUNT_ID is unset (dev without R2), fall through to the broad
// `*.r2.cloudflarestorage.com` so dev doesn't break — signed URLs still
// gate access. In production, R2_ACCOUNT_ID MUST be set.
const r2Host = process.env.R2_ACCOUNT_ID
  ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com https://*.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : 'https://*.r2.cloudflarestorage.com'

// Phase F3 — Public-bucket CDN host. When R2_PUBLIC_URL is set we serve
// cosmetic images (covers, logos, gallery) unsigned from this origin. The
// public bucket is a separate Cloudflare R2 bucket with public-read enabled;
// the URL is the Cloudflare-issued `pub-<hash>.r2.dev` or a custom domain.
//
// Parsing is defensive: if R2_PUBLIC_URL is malformed (set to `?` or
// missing protocol), `new URL(...)` throws and we skip the entry. Build
// succeeds with the rest of the allowlist intact — the cover images won't
// load at runtime, but neither will the deploy crash. In production,
// R2_PUBLIC_URL MUST be a parseable absolute URL.
let r2PublicHost: string | null = null
if (process.env.R2_PUBLIC_URL) {
  try {
    r2PublicHost = new URL(process.env.R2_PUBLIC_URL).hostname
  } catch {
    // Malformed URL — log nothing here (config files have no logger) and
    // skip the CSP/remotePatterns entries below. The runtime resolver will
    // log a load failure when the first image tries to render.
    r2PublicHost = null
  }
}
const r2PublicHostDirective = r2PublicHost ? ` https://${r2PublicHost}` : ''

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com"
  : "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com"

// Phase F3 — `connect-src` also gets the public-bucket host so admin
// browser PUTs (presigned uploads into the public bucket) aren't blocked.
const connectSrc = isDev
  ? `connect-src 'self' ws://localhost:* http://localhost:* https://api.stripe.com https://checkout.stripe.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com ${r2Host}${r2PublicHostDirective}`
  : `connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.ingest.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com ${r2Host}${r2PublicHostDirective}`

const cspDirectives = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Phase F2 — R2 signed-URL host added to img-src so next/image accepts
  // signed covers, and to media-src so the HTML5 <video> element can fetch
  // R2-hosted lecture videos. Stripe/YouTube/Vimeo/ImageKit/Uploadthing
  // entries remain unchanged.
  // Phase F3 — public-bucket CDN host appended when R2_PUBLIC_URL is set.
  // Covers / logos / gallery served unsigned from `pub-<hash>.r2.dev` (or
  // the configured custom domain) must be img-allowed.
  `img-src 'self' data: blob: https://files.stripe.com https://lh3.googleusercontent.com https://img.youtube.com https://i.ytimg.com https://*.vimeocdn.com https://ik.imagekit.io https://utfs.io ${r2Host}${r2PublicHostDirective}`,
  `media-src 'self' blob: ${r2Host}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  // Phase F2 — R2 added to frame-src so session-item PDFs (rendered via
  // <iframe src={signedUrl}> in components/library/session/PdfInline.tsx)
  // load instead of being CSP-blocked. Same dual-host shape as connect/img.
  `frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com ${r2Host}`,
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

// Phase F2 — Cloudflare R2 endpoint host. Derived from R2_ACCOUNT_ID so
// rotation doesn't require a code edit. The R2 S3-compatible host shape is
// `<account-id>.r2.cloudflarestorage.com`; signed URLs returned by the
// presigner use this hostname. When the env var is missing (dev or build
// without R2 credentials), we skip the entry — build proceeds, but signed
// covers won't render until R2_ACCOUNT_ID is configured in production.
if (process.env.R2_ACCOUNT_ID) {
  // Path-style host (List/Head/Delete operations).
  remotePatterns.push({
    protocol: 'https',
    hostname: `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  })
  // Virtual-host bucket-subdomain — where signed GET/PUT URLs actually
  // live when the adapter uses forcePathStyle:false. next/image's
  // hostname matcher supports a leading `*.` wildcard for one subdomain
  // level; that's enough to cover any bucket under this account.
  remotePatterns.push({
    protocol: 'https',
    hostname: `*.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  })
}

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

// Phase F3 — public-bucket CDN host. Same parse-or-skip pattern as
// NEXT_PUBLIC_APP_URL above. The host shape from r2.dev is
// `pub-<hash>.r2.dev`; a custom domain swap is also valid. We resolve
// `R2_PUBLIC_URL` once at top-level (see `r2PublicHost`) so the CSP and
// remotePatterns derivations stay consistent.
if (r2PublicHost) {
  remotePatterns.push({ protocol: 'https', hostname: r2PublicHost })
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // PERF — shrink the dev module graph for big libraries by deep-importing
  // only what each component touches. Works in both Webpack and Turbopack
  // and shaves significant time off first-route compile.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'motion',
      'motion/react',
      'date-fns',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@base-ui/react',
    ],
  },
  // Turbopack mirror of the `webpack` block below. Turbopack ignores the
  // `webpack: (config) => …` callback entirely, so any alias we rely on at
  // build time must be declared here too. Keep this in lockstep with the
  // webpack block — see the PDF.js section in CLAUDE.md.
  turbopack: {
    resolveAlias: {
      // `canvas` is an optional pdfjs-dist Node-only dep we never use. The
      // webpack pipeline aliases it to `false`; Turbopack requires a real
      // module path. `lib/stubs/empty-module.js` is intentionally empty.
      canvas: './lib/stubs/empty-module.js',
      // pdfjs-dist@5's modern build crashes under bundling; the legacy
      // build at `legacy/build/pdf.mjs` is the same library transpiled
      // to a shape both bundlers can handle. See `docs/architecture/
      // pdf-reader.md` and the webpack block below for the full rationale.
      'pdfjs-dist': 'pdfjs-dist/legacy/build/pdf.mjs',
    },
  },
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
