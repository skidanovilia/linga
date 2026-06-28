import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'

export type ButtonVariant = 'red' | 'blue' | 'yellow' | 'outline' | 'ghost'
export type ButtonShape = 'square' | 'pill'

interface ButtonStyleProps {
  variant?: ButtonVariant
  shape?: ButtonShape
  className?: string
}

// Shared base: thick ink border, hard offset shadow, uppercase Outfit, and the
// physical "press" — the button slides into its shadow and the shadow vanishes.
const base =
  'inline-flex items-center justify-center gap-2 border-2 md:border-4 border-ink ' +
  'font-display font-bold uppercase tracking-tight px-5 py-3 leading-none ' +
  'transition-transform duration-200 ease-out ' +
  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ' +
  'focus-visible:outline-4 focus-visible:outline-offset-2 ' +
  'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-muted ' +
  'disabled:text-ink/50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0'

const variants: Record<ButtonVariant, string> = {
  red: 'bg-bauhaus-red text-white shadow-hard md:shadow-hard-lg focus-visible:outline-bauhaus-yellow',
  blue: 'bg-bauhaus-blue text-white shadow-hard md:shadow-hard-lg focus-visible:outline-bauhaus-yellow',
  yellow: 'bg-bauhaus-yellow text-ink shadow-hard md:shadow-hard-lg focus-visible:outline-ink',
  outline: 'bg-canvas text-ink shadow-hard md:shadow-hard-lg hover:bg-muted focus-visible:outline-ink',
  // Ghost is the lightweight inline-link variant (back links, toggles): no box,
  // no shadow, normal case — so it overrides the uppercase/border/padding base.
  ghost:
    'inline-flex items-center justify-center gap-1 border-none px-2 py-1 ' +
    'font-medium normal-case tracking-normal text-ink ' +
    'transition-colors duration-200 ease-out hover:text-bauhaus-blue ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
}

const shapes: Record<ButtonShape, string> = {
  square: 'rounded-none',
  pill: 'rounded-full',
}

/** Build the Bauhaus button class string. Shared by Button, ButtonLink, and any
 *  element that needs to look like a button (e.g. a disabled status pill). */
export function buttonClasses({ variant = 'red', shape = 'square', className = '' }: ButtonStyleProps = {}): string {
  if (variant === 'ghost') {
    return `${variants.ghost} ${className}`.trim()
  }
  return `${base} ${variants[variant]} ${shapes[shape]} ${className}`.trim()
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps

/** A native `<button>` in the Bauhaus style. */
export function Button({ variant, shape, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, shape, className })} {...rest} />
}

type ButtonLinkProps = LinkProps & ButtonStyleProps

/** A react-router `<Link>` styled as a Bauhaus button (most CTAs are links). */
export function ButtonLink({ variant, shape, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, shape, className })} {...rest} />
}
