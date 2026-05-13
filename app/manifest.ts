import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/constants'

const SITE_NAME_AR = 'د. خالد غطاس'
const SHORT_NAME = 'Khaled Ghattass'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: SITE_NAME,
    short_name: SHORT_NAME,
    // Manifest declares lang: 'ar' below, so the description must match.
    // Web Manifest has no built-in per-locale descriptions; the primary
    // locale wins.
    description:
      'الموقع الرسمي للدكتور خالد غطاس — عالم بيولوجيا الخلايا وخبير في السلوك البشري، كاتب ومحاضر، مؤسس مبادرة الورشة.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#EDE7DF',
    theme_color: '#EDE7DF',
    lang: 'ar',
    dir: 'rtl',
    categories: ['education', 'books', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        // Next.js serves the app/apple-icon.png file at /apple-icon (no
        // .png extension) under the file-based metadata convention. The
        // explicit /apple-icon.png path 404s; using the canonical Next
        // URL keeps the iOS home-screen install icon correct.
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: SITE_NAME_AR,
        short_name: SITE_NAME_AR,
        url: '/',
      },
    ],
  }
}
