import type { Variants, Transition } from 'motion/react'

export const EASE_EDITORIAL: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_REVEAL: [number, number, number, number] = [0.22, 1, 0.36, 1]
export const EASE_DRAMATIC: [number, number, number, number] = [0.65, 0, 0.35, 1]
export const EASE_STAGGER: [number, number, number, number] = [0.4, 0, 0.2, 1]

export const VIEWPORT_DEFAULT = { once: true, margin: '-100px' as const }
export const VIEWPORT_BIDIRECTIONAL = { once: false, margin: '-15%' as const }

const baseTransition: Transition = {
  duration: 0.6,
  ease: EASE_EDITORIAL,
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
}

/**
 * Bidirectional companion to fadeUp.
 * Use with viewport={{ once: false, margin: '-15%' }} so elements
 * dim back out as they leave the viewport on scroll-up.
 */
export const fadeUpBidirectional: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    transition: { duration: 0.5, ease: EASE_EDITORIAL },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_EDITORIAL },
  },
}

export const blurRevealBidirectional: Variants = {
  hidden: {
    opacity: 0,
    filter: 'blur(8px)',
    y: 12,
    transition: { duration: 0.5, ease: EASE_REVEAL },
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 0.8, ease: EASE_REVEAL },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: baseTransition },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_EDITORIAL } },
}

export const slideInStart: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_REVEAL } },
}

export const slideInEnd: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_REVEAL } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: EASE_EDITORIAL },
  },
}

export const maskRevealUp: Variants = {
  hidden: { opacity: 0, clipPath: 'inset(100% 0 0 0)' },
  visible: {
    opacity: 1,
    clipPath: 'inset(0% 0 0 0)',
    transition: { duration: 0.9, ease: EASE_REVEAL },
  },
}

export const maskRevealDown: Variants = {
  hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
  visible: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.9, ease: EASE_REVEAL },
  },
}

export const blurReveal: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)', y: 12 },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 0.8, ease: EASE_REVEAL },
  },
}

export function fadeUpDelayed(delay: number): Variants {
  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE_EDITORIAL, delay },
    },
  }
}

export function staggerContainerWith(stagger: number, delay = 0.05): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  }
}

/**
 * Page-turn transition for the multi-step gift send flow.
 *
 * Direction-aware: pass `custom={{ direction, isRtl }}` to <motion.div>
 * inside an <AnimatePresence mode="wait" custom={...}>.
 *  - direction:  1 → moving forward (Next),  -1 → moving back (Back)
 *  - isRtl:      true when locale === 'ar' (mirrors x-axis travel)
 *
 * LTR Next: outgoing exits left, incoming enters from right.
 * RTL Next: mirrored — outgoing exits right, incoming enters from left.
 * Reduced motion is handled at the call site (the consumer swaps in
 * a plain opacity crossfade when useReducedMotion() returns true).
 */
export type PageTurnCustom = { direction: 1 | -1; isRtl: boolean }

export const pageTurnVariants: Variants = {
  enter: ({ direction, isRtl }: PageTurnCustom) => {
    const sign = isRtl ? -1 : 1
    return {
      x: direction * sign * 60,
      opacity: 0,
    }
  },
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { duration: 0.22, ease: EASE_EDITORIAL },
      opacity: { duration: 0.22, ease: EASE_EDITORIAL },
    },
  },
  exit: ({ direction, isRtl }: PageTurnCustom) => {
    const sign = isRtl ? -1 : 1
    return {
      x: -direction * sign * 60,
      opacity: 0,
      transition: {
        x: { duration: 0.2, ease: EASE_EDITORIAL },
        opacity: { duration: 0.2, ease: EASE_EDITORIAL },
      },
    }
  },
}

export const pageTurnReducedMotion: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2, ease: 'linear' } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'linear' } },
}

/**
 * Claim-success cinematic reveal sequence.
 *
 * Five layers play in sequence (see design's ClaimSuccessSpec):
 *   1. Open button fades out          0   – 200ms
 *   2. Sienna ribbon strokes          180 – 480ms (1px height, accent)
 *   3. Item card lifts + fades        380 – 780ms
 *   4. "Yours" eyebrow scales in      700 – 980ms
 *   5. Forward CTA fades up           900 – 1220ms
 *
 * Reduced motion: the consumer skips the ribbon entirely and uses
 * `claimSuccessReducedMotion` (240ms opacity crossfade, linear).
 *
 * Ribbon stroke direction is start-edge → end-edge in both scripts:
 * scaleX(0) → scaleX(1) with transformOrigin set to the inline-start.
 */
export const claimRibbon: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: {
      scaleX: { duration: 0.3, ease: EASE_EDITORIAL, delay: 0.18 },
      opacity: { duration: 0.16, ease: 'linear', delay: 0.18 },
    },
  },
}

export const claimYours: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: EASE_EDITORIAL,
      delay: 0.7,
    },
  },
}

export const claimForwardCta: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: EASE_EDITORIAL,
      delay: 0.9,
    },
  },
}

export const claimSuccessReducedMotion: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24, ease: 'linear' } },
}
