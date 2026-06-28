type ShapeKind = 'circle' | 'square' | 'triangle'
type ShapeColor = 'red' | 'blue' | 'yellow' | 'ink'

interface ShapeProps {
  kind: ShapeKind
  color: ShapeColor
  /** Edge length in px. */
  size?: number
  /** 45° rotation — the deliberate Bauhaus tilt (squares become diamonds). */
  rotated?: boolean
  className?: string
}

const fill: Record<ShapeColor, string> = {
  red: 'bg-bauhaus-red',
  blue: 'bg-bauhaus-blue',
  yellow: 'bg-bauhaus-yellow',
  ink: 'bg-ink',
}

const shape: Record<ShapeKind, string> = {
  circle: 'rounded-full',
  square: 'rounded-none',
  triangle: 'rounded-none [clip-path:polygon(50%_0%,0%_100%,100%_100%)]',
}

/**
 * A single Bauhaus primitive — circle, square, or triangle in a primary color.
 * Purely decorative (aria-hidden); used for card-corner marks, list accents,
 * and tally markers. Triangles are cut from a square via clip-path.
 */
export function Shape({ kind, color, size = 16, rotated = false, className = '' }: ShapeProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-block ${shape[kind]} ${fill[color]} ${
        rotated ? 'rotate-45' : ''
      } ${className}`}
    />
  )
}
