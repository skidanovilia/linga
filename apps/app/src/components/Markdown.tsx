import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// The app's single markdown renderer. Content is trusted (authored grammar
// pages), but we still render through react-markdown — it produces React
// elements, never raw HTML injection (HTML in the source is escaped; no
// rehype-raw). Styling follows the Bauhaus system.
//
// Font constraint: headings and body carry Russian (Cyrillic) and inline code
// carries Georgian, so everything stays on `font-content` (the multi-script
// stack) and is NEVER uppercased or set in `font-display`. In particular, the
// browser's default monospace for <code> would drop Georgian glyphs, so inline
// code is explicitly re-set to `font-content`.

const components: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-0 text-2xl font-bold leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-5 text-xl font-bold leading-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-bold leading-tight">{children}</h3>,
  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-bauhaus-blue underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-ink pl-4 italic text-ink/80">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-t-2 border-ink" />,
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-none border-2 border-ink bg-muted p-3">{children}</pre>
  ),
  code: ({ className, children, ...rest }) => {
    const text = String(children)
    const isBlock = /language-/.test(className ?? '') || text.includes('\n')
    if (isBlock) {
      // Inside <pre>; the wrapper owns the box, so keep the glyph font only.
      return (
        <code className="font-content text-[0.95em]" {...rest}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded-none border-2 border-ink bg-muted px-1.5 py-0.5 font-content text-[0.95em]"
        {...rest}
      >
        {children}
      </code>
    )
  },
}

/** Render a markdown string as sanitized, Bauhaus-styled React elements. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="font-content text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
