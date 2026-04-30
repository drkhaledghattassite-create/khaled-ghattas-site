import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/constants'

const SITE_NAME_AR = 'د. خالد غطاس'
const SHORT_NAME = 'Khaled Ghattass'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: SITE_NAME,
    short_name: SHORT_NAME,
    description:
      'The official site of Dr. Khaled Ghattass — cell biologist, expert in human behavior, author, speaker, founder of Al-Warsheh.',
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
        src: '/apple-icon.png',
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
