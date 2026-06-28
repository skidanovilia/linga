import type { HTMLAttributes, ReactNode } from 'react'
import { Shape } from './Shape'

type Decoration = 'red' | 'blue' | 'yellow'
type DecorationShape = 'circle' | 'square' | 'triangle'

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Primary-color corner mark in the top-right. Omit for none. */
  decoration?: Decoration | null
  decorationShape?: DecorationShape
  /** Hover-lift affordance. Static cards only — never on a motion/drag card,
   *  where a Tailwind transform would fight motion's inline transform. */
  interactive?: boolean
  /** Render as <li> for list items (the units list). */
  as?: 'div' | 'li'
  children: ReactNode
}

const cornerShape: Record<DecorationShape, number> = { circle: 14, square: 14, triangle: 16 }

/**
 * The Bauhaus surface: white panel, thick ink border, hard offset shadow, square
 * corners. An optional geometric mark overlaps the top-right corner. Padding is
 * left to the caller via `className` (cards range from snug to generous).
 */
export function Card({
  decoration = null,
  decorationShape = 'square',
  interactive = false,
  as = 'div',
  className = '',
  children,
  ...rest
}: CardProps) {
  const Tag = as
  return (
    <Tag
      className={`relative border-2 md:border-4 border-ink bg-white rounded-none shadow-hard md:shadow-hard-lg ${
        interactive
          ? 'transition-transform duration-200 ease-out hover:-translate-y-1 md:hover:shadow-hard-xl'
          : ''
      } ${className}`}
      {...rest}
    >
      {decoration && (
        <span className="pointer-events-none absolute -right-2 -top-2 md:-right-3 md:-top-3">
          <Shape
            kind={decorationShape}
            color={decoration}
            size={cornerShape[decorationShape]}
            rotated={decorationShape === 'square'}
            className="border-2 border-ink"
          />
        </span>
      )}
      {children}
    </Tag>
  )
}
