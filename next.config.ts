import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts')

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Hide the floating "N issues" / build-activity badge in dev — it stamps
  // every screenshot and serves no production purpose.
  devIndicators: false,
}

export default withNextIntl(nextConfig)
