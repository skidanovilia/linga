import type { InputHTMLAttributes } from 'react'

/**
 * A boxed Bauhaus text input — square, thick ink border, blue focus ring. Used
 * by the login form. (The FillType challenge keeps its bespoke underline input.)
 */
export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`border-2 md:border-4 border-ink rounded-none bg-white px-4 py-3 font-content text-base outline-none placeholder:text-ink/40 focus-visible:ring-4 focus-visible:ring-bauhaus-blue ${className}`}
      {...rest}
    />
  )
}
