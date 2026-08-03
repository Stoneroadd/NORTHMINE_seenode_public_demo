import type { ImgHTMLAttributes } from 'react'

type NorthmineLogoVariant = 'full' | 'horizontal' | 'symbol'

interface NorthmineLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  variant?: NorthmineLogoVariant
}

const logoAssets: Record<NorthmineLogoVariant, { src: string; width: number; height: number }> = {
  full: {
    src: '/assets/brand/northmine-logo-transparent.png',
    width: 1536,
    height: 1024,
  },
  horizontal: {
    src: '/assets/brand/northmine-logo-horizontal-transparent.png',
    width: 2172,
    height: 724,
  },
  symbol: {
    src: '/assets/brand/northmine-symbol-transparent.png',
    width: 512,
    height: 512,
  },
}

export function NorthmineLogo({
  variant = 'full',
  alt = 'NORTHMINE Intelligence Hub',
  className,
  width,
  height,
  decoding = 'async',
  ...props
}: NorthmineLogoProps) {
  const asset = logoAssets[variant]

  return (
    <img
      {...props}
      className={className}
      src={asset.src}
      alt={alt}
      width={width ?? asset.width}
      height={height ?? asset.height}
      decoding={decoding}
    />
  )
}
