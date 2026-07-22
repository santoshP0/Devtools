import { useLocation } from 'react-router-dom'
import { ReactNode, useEffect } from 'react'
import { useHistory } from '../lib/storage'
import { toolContent } from '../lib/toolContent'

interface Props {
  title: string
  description: string
  children: ReactNode
  fullWidth?: boolean
}

export default function ToolLayout({ title, description, children, fullWidth = false }: Props) {
  const { pathname } = useLocation()
  const { trackVisit } = useHistory()

  useEffect(() => {
    document.title = `${title} | DevToolbox`
    const slug = pathname.split('/').pop()
    if (slug) trackVisit(slug)

    // Give each tool a unique description + canonical URL so crawlers (and
    // AdSense) see distinct pages rather than one repeated SPA shell.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') ?? ''
    meta?.setAttribute('content', `${title} — ${description}`)

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + pathname

    return () => {
      document.title = 'DevToolbox – Free Developer Tools'
      if (meta && prevDesc) meta.setAttribute('content', prevDesc)
    }
  }, [title, description, pathname])

  return (
    // Outer: full-viewport scroll container — scrollbar sits at screen edge,
    // and wheel events from anywhere on the page are captured here.
    <div style={{
      height: '100dvh',
      paddingTop: 54,
      boxSizing: 'border-box',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'var(--sketch-bg)',
      backgroundImage: 'radial-gradient(var(--sketch-dot) 1.2px, transparent 1.2px)',
      backgroundSize: '20px 20px',
    }}>
      {/* Inner: constrains width + is a flex column so children can use flex:1.
          fullWidth: bounded to viewport height on desktop (.tool-inner-full) so
          panes with flex:1/minHeight:0 scroll internally instead of the page. */}
      <div className={fullWidth ? 'tool-inner-full' : undefined} style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: fullWidth ? '24px 32px' : '32px',
        maxWidth: fullWidth ? '100%' : 1200,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        animation: 'fadeUp 0.35s ease both',
      }}>
        <p style={{
          fontSize: 14, color: 'var(--sketch-text)',
          marginBottom: 24, fontFamily: "'Architects Daughter', var(--font-sans)",
          opacity: 0.8,
          flexShrink: 0,
        }}>
          {description}
        </p>
        {children}
      </div>
      {/* Outside the inner container: fullWidth tools bound that to the viewport
          height for internal scrolling, which would clip this section. */}
      <ToolAbout slug={pathname.split('/').filter(Boolean)[0]} title={title} />
    </div>
  )
}

/** Long-form explainer + FAQ rendered below the tool. Sits under the fold so
 *  the tool stays the hero, while giving the page real content to read. */
function ToolAbout({ slug, title }: { slug?: string; title: string }) {
  const content = slug ? toolContent[slug] : undefined
  if (!content) return null

  return (
    <section style={{
      margin: '0 auto',
      padding: '28px 32px 56px',
      borderTop: '1px solid var(--border)',
      maxWidth: 760,
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-sans)',
      color: 'var(--sketch-text)',
    }}>
      <h2 style={{
        fontSize: 18, fontWeight: 700, marginBottom: 14,
        fontFamily: "'Architects Daughter', var(--font-sans)",
      }}>
        About {title}
      </h2>
      {content.about.map((p, i) => (
        <p key={i} style={{ fontSize: 14.5, lineHeight: 1.75, marginBottom: 14, opacity: 0.85 }}>{p}</p>
      ))}

      {content.faq && content.faq.length > 0 && (
        <>
          <h2 style={{
            fontSize: 18, fontWeight: 700, margin: '28px 0 14px',
            fontFamily: "'Architects Daughter', var(--font-sans)",
          }}>
            Frequently asked questions
          </h2>
          {content.faq.map((f, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>{f.q}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.75, opacity: 0.85 }}>{f.a}</p>
            </div>
          ))}
        </>
      )}
    </section>
  )
}
