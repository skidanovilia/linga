interface GeometricLogoProps {
  /** Height in px; width scales with the three-shape row. */
  size?: number
  className?: string
}

/**
 * The brand mark: the three Bauhaus primitives — yellow circle, blue square,
 * red triangle — in a row with thick ink strokes. Mirrors public/favicon.svg.
 * Custom geometry (lucide shapes are single-weight outlines), aria-hidden since
 * the wordmark beside it carries the name.
 */
export function GeometricLogo({ size = 40, className = '' }: GeometricLogoProps) {
  return (
    <svg
      width={(size / 24) * 64}
      height={size}
      viewBox="0 0 64 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="10" cy="12" r="9" fill="#F0C020" stroke="#121212" strokeWidth="2.5" />
      <rect x="23" y="3" width="18" height="18" fill="#1040C0" stroke="#121212" strokeWidth="2.5" />
      <path d="M54 3 L63 21 L45 21 Z" fill="#D02020" stroke="#121212" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}
