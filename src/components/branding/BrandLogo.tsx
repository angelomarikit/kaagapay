import { cn } from '@/lib/utils'

const widthBySize = {
  sm: 'w-[168px] max-w-full',
  md: 'w-[220px] max-w-full',
  lg: 'w-[min(100%,360px)] max-w-full',
  /** Auth card — official HD master (logo-source.jpg) */
  hd: 'w-[min(100%,420px)] max-w-full',
  /** Navy sidebar — diamond lockup */
  sidebar: 'w-full max-w-[232px]',
} as const

const LOGO_SRC = {
  full: '/branding/logo-source.jpg',
  mark: '/branding/logo-mark.png',
  sidebar: '/branding/sidebar-logo.png',
} as const

const LOGO_DIM = {
  full: { width: 1024, height: 576 },
  mark: { width: 974, height: 428 },
  sidebar: { width: 640, height: 320 },
} as const

type BrandLogoProps = {
  /** `sidebar` = official diamond lockup for navy panels */
  variant?: 'full' | 'mark' | 'sidebar'
  size?: keyof typeof widthBySize
  className?: string
}

export function BrandLogo({ variant = 'full', size = 'md', className }: BrandLogoProps) {
  const src = LOGO_SRC[variant]
  const intrinsic = LOGO_DIM[variant]

  return (
    <img
      src={src}
      alt="KAAGAPAY — Multi-Purpose and Transport Service Coop. KMPTSC"
      width={intrinsic.width}
      height={intrinsic.height}
      className={cn('mx-auto block h-auto object-contain', widthBySize[size], className)}
      draggable={false}
      decoding="sync"
      loading="eager"
    />
  )
}