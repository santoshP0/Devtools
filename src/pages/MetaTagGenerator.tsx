import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

interface MetaFields {
  title: string; description: string; keywords: string; author: string; canonical: string
  ogTitle: string; ogDescription: string; ogImage: string; ogType: string
  twitterCard: string; twitterSite: string; twitterCreator: string
  robots: string; viewport: string; charset: string; themeColor: string
}

export default function MetaTagGeneratorPage() {
  const [fields, setFields] = useState<MetaFields>({
    title: 'My Awesome Page', description: 'A great page about something interesting.',
    keywords: 'web, development, tools', author: 'DevToolbox', canonical: 'https://example.com',
    ogTitle: '', ogDescription: '', ogImage: 'https://example.com/og-image.png', ogType: 'website',
    twitterCard: 'summary_large_image', twitterSite: '@devtoolbox', twitterCreator: '@author',
    robots: 'index, follow', viewport: 'width=device-width, initial-scale=1',
    charset: 'UTF-8', themeColor: '#0d9488',
  })

  const set = (k: keyof MetaFields, v: string) => setFields(f => ({...f, [k]: v}))

  const generated = useMemo(() => {
    const f = fields
    const og = f.ogTitle || f.title
    const ogd = f.ogDescription || f.description
    const lines = [
      `<!-- Primary -->`,
      `<meta charset="${f.charset}">`,
      `<meta name="viewport" content="${f.viewport}">`,
      `<title>${f.title}</title>`,
      f.description && `<meta name="description" content="${f.description}">`,
      f.keywords    && `<meta name="keywords" content="${f.keywords}">`,
      f.author      && `<meta name="author" content="${f.author}">`,
      f.robots      && `<meta name="robots" content="${f.robots}">`,
      f.themeColor  && `<meta name="theme-color" content="${f.themeColor}">`,
      f.canonical   && `<link rel="canonical" href="${f.canonical}">`,
      `\n<!-- Open Graph -->`,
      `<meta property="og:type" content="${f.ogType}">`,
      `<meta property="og:title" content="${og}">`,
      `<meta property="og:description" content="${ogd}">`,
      f.ogImage     && `<meta property="og:image" content="${f.ogImage}">`,
      f.canonical   && `<meta property="og:url" content="${f.canonical}">`,
      `\n<!-- Twitter Card -->`,
      `<meta name="twitter:card" content="${f.twitterCard}">`,
      `<meta name="twitter:title" content="${og}">`,
      `<meta name="twitter:description" content="${ogd}">`,
      f.ogImage     && `<meta name="twitter:image" content="${f.ogImage}">`,
      f.twitterSite && `<meta name="twitter:site" content="${f.twitterSite}">`,
      f.twitterCreator && `<meta name="twitter:creator" content="${f.twitterCreator}">`,
    ].filter(Boolean)
    return lines.join('\n')
  }, [fields])

  const F = ({ k, label, placeholder, type = 'text', span = 1 }: { k: keyof MetaFields; label: string; placeholder?: string; type?: string; span?: number }) => (
    <div style={{ gridColumn: `span ${span}` }}>
      <label>{label}</label>
      <input type={type} value={fields[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} />
    </div>
  )

  return (
    <ToolLayout title="Meta Tag Generator" description="Generate SEO, Open Graph and Twitter Card meta tags">
      <div className="one-col">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <F k="title"       label="Page Title"         placeholder="My Awesome Page" span={2} />
          <F k="description" label="Meta Description"   placeholder="Page description…" span={2} />
          <F k="keywords"    label="Keywords"           placeholder="comma, separated" />
          <F k="author"      label="Author"             placeholder="Name or @handle" />
          <F k="canonical"   label="Canonical URL"      placeholder="https://example.com" span={2} />
          <F k="robots"      label="Robots"             placeholder="index, follow" />
          <F k="themeColor"  label="Theme Color"        type="color" />
          <div style={{ gridColumn:'span 2', borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4 }}>
            <div className="section-label">Open Graph</div>
          </div>
          <F k="ogTitle"       label="OG Title (leave blank to use page title)" placeholder="" span={2} />
          <F k="ogDescription" label="OG Description"  placeholder="" span={2} />
          <F k="ogImage"       label="OG Image URL"    placeholder="https://…/og.png" span={2} />
          <div>
            <label>OG Type</label>
            <select value={fields.ogType} onChange={e => set('ogType', e.target.value)}>
              {['website','article','blog','product','profile'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'span 2', borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4 }}>
            <div className="section-label">Twitter Card</div>
          </div>
          <div>
            <label>Card Type</label>
            <select value={fields.twitterCard} onChange={e => set('twitterCard', e.target.value)}>
              {['summary','summary_large_image','app','player'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <F k="twitterSite"    label="Twitter Site"    placeholder="@yoursite" />
          <F k="twitterCreator" label="Twitter Creator" placeholder="@author" />
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">Generated HTML</div>
            <CopyBtn text={generated} label="Copy All" />
          </div>
          <pre className="code-out large" style={{ fontSize:12, lineHeight:1.8 }}>{generated}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
