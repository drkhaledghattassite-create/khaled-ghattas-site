import Image from 'next/image'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'

const LOGO_ASPECT_RATIO = 2560 / 1905

type LogoProps = {
  /** Pixel height. Width is computed from the natural 2560×1905 aspect ratio. */
  height: number
  alt: string
  className?: string
  priority?: boolean
}

export function Logo({ height, alt, className, priority }: LogoProps) {
  const width = Math.round(height * LOGO_ASPECT_RATIO)
  return (
    <Image
      src="/logo-black.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn('h-auto w-auto select-none', className)}
      style={{ height }}
    />
  )
}

type LogoLinkProps = LogoProps & {
  href?: string
  onClick?: () => void
}

export function LogoLink({ href = '/', onClick, height, alt, className, priority }: LogoLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={alt}
      className="inline-flex items-center transition-opacity hover:opacity-80 focus:opacity-80"
    >
      <Logo height={height} alt={alt} className={className} priority={priority} />
    </Link>
  )
}
