import { useState, useEffect, useCallback, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'
import { useNativeDrop } from '../hooks/useNativeDrop'
import { useOpenedFile } from '../lib/openWith'
import { marked, Renderer } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'

/* ─── Mermaid init ─── */
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'var(--font-sans)',
})

/* ─── Marked config ─── */

// Syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      // mermaid is a diagram, not code — leave it exactly as written
      if (lang === 'mermaid') return code
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    },
  }),
)

// Custom renderer for mermaid blocks + callouts
const renderer = new Renderer()
let mermaidCounter = 0
/** Diagram source by block id — the DOM copy passes through escaping first. */
const mermaidSource = new Map<string, string>()
const escapeHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

renderer.code = function (code: string, lang: string | undefined, _escaped: boolean): string {
  if (lang === 'mermaid') {
    const id = `mermaid-${mermaidCounter++}`
    mermaidSource.set(id, code)
    // Falls back to the readable source if rendering never happens; the effect
    // replaces this with the SVG.
    return `<div class="mermaid-block" data-mermaid-id="${id}"><pre>${escapeHtml(code)}</pre></div>`
  }
  const langClass = lang ? ` class="hljs language-${lang}"` : ''
  return `<pre><code${langClass}>${code}</code></pre>\n`
}

// Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!CAUTION], > [!IMPORTANT]
renderer.blockquote = function (quote: string): string {
  const calloutMatch = quote.match(/^\s*<p>\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*<br\s*\/?>\s*/i)
    || quote.match(/^\s*<p>\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*\n/i)
    || quote.match(/^\s*<p>\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]<\/p>\s*/i)

  if (calloutMatch) {
    const type = calloutMatch[1].toLowerCase()
    const icons: Record<string, string> = {
      note: 'ℹ️', tip: '💡', warning: '⚠️', caution: '🔴', important: '❗',
    }
    const content = quote.replace(calloutMatch[0], '<p>')
    return `<div class="md-callout md-callout-${type}">
      <div class="md-callout-title">${icons[type] || ''} ${type.charAt(0).toUpperCase() + type.slice(1)}</div>
      <div class="md-callout-body">${content}</div>
    </div>`
  }
  return `<blockquote>\n${quote}</blockquote>\n`
}

marked.use({ renderer })

/* ─── Helpers ─── */

function stripFrontmatter(md: string): { frontmatter: Record<string, string> | null; body: string } {
  const match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!match) return { frontmatter: null, body: md }

  const raw = match[1]
  const fm: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const val = line.slice(idx + 1).trim()
      fm[key] = val
    }
  }
  return { frontmatter: fm, body: md.slice(match[0].length) }
}

function renderMath(html: string): string {
  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
    } catch { return `<code>${tex}</code>` }
  })
  // Inline math: $...$  (not $$)
  html = html.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    } catch { return `<code>${tex}</code>` }
  })
  return html
}

function renderFrontmatterHtml(fm: Record<string, string>): string {
  let html = '<table class="md-frontmatter-table"><tbody>'
  for (const [key, val] of Object.entries(fm)) {
    const cleanVal = val.replace(/^\[|\]$/g, '')
    const isTags = val.startsWith('[') && val.endsWith(']')
    let rendered = ''
    if (isTags) {
      const tags = cleanVal.split(',').map(t => t.trim().replace(/^"|"$/g, ''))
      rendered = tags.map(t => `<span class="md-fm-tag">${t}</span>`).join(' ')
    } else {
      rendered = cleanVal.replace(/^"|"$/g, '')
    }
    html += `<tr><td class="md-fm-key">${key}</td><td class="md-fm-val">${rendered}</td></tr>`
  }
  html += '</tbody></table>'
  return html
}

/* ─── Sanitizer config ─── */
const SANITIZE_CONFIG = {
  ADD_TAGS: ['semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover',
    'munder', 'munderover', 'msqrt', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace',
    'annotation', 'math', 'mpadded', 'menclose', 'mglyph', 'none', 'mprescripts',
    'mmultiscripts', 'mroot', 'mstyle', 'mphantom', 'maction',
    'svg', 'g', 'path', 'line', 'rect', 'circle', 'ellipse', 'polygon',
    'polyline', 'text', 'tspan', 'defs', 'marker', 'use', 'clipPath', 'foreignObject',
    'image', 'pattern', 'mask', 'linearGradient', 'radialGradient', 'stop',
    'animate', 'animateTransform', 'animateMotion', 'set'],
  ADD_ATTR: ['xmlns', 'encoding', 'mathvariant', 'stretchy', 'fence', 'separator',
    'accent', 'accentunder', 'columnalign', 'rowalign', 'columnspacing', 'rowspacing',
    'columnlines', 'rowlines', 'frame', 'framespacing', 'equalrows', 'equalcolumns',
    'displaystyle', 'lspace', 'rspace', 'movablelimits', 'largeop', 'minsize',
    'maxsize', 'symmetric', 'linethickness', 'scriptlevel', 'width', 'height',
    'depth', 'voffset', 'data-mermaid-id', 'aria-hidden', 'focusable', 'role',
    'viewBox', 'preserveAspectRatio', 'd', 'fill', 'stroke', 'stroke-width',
    'transform', 'x', 'y', 'dx', 'dy', 'text-anchor', 'dominant-baseline',
    'font-size', 'font-family', 'font-weight', 'class', 'style', 'marker-end',
    'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points'],
}

/* ─── Sample ─── */
const SAMPLE = `---
title: Welcome to Markdown Viewer
description: A GitHub-style Markdown renderer with live preview, math, diagrams, and export support.
author: ThisIs-Developer
tags: ["markdown", "preview", "mermaid", "latex", "open-source"]
---

# Welcome to Markdown Viewer

## ✨ Key Features
- **Live Preview** with GitHub styling
- **Smart Import/Export** (MD, HTML, PDF)
- **Syntax Highlighting** for 190+ languages
- **Mathematical Expressions** with LaTeX
- **Mermaid Diagrams** (flowcharts, sequences, etc.)
- **Callouts** (notes, warnings, tips)
- **Tables** with alignment support

---

## 💻 Code Highlighting

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  // Syntax highlighting is handled automatically
  // during the parsing phase by the marked renderer.
  // Themes are applied instantly via CSS variables.
  return response.json();
}
\`\`\`

## 🧮 Mathematical Expressions

Write complex formulas with LaTeX syntax:

Inline equation: $E = mc^2$

Display equations:

$$\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

$$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$$

## 🧜 Mermaid Diagrams

Create powerful visualizations directly in markdown:

\`\`\`mermaid
flowchart LR
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    C --> E[Deploy]
    D --> B
\`\`\`

### Sequence Diagram Example
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant S as Server
    U->>A: Click Button
    A->>S: API Request
    S-->>A: JSON Response
    A-->>U: Update UI
\`\`\`

## 📋 Tables

| Feature | Status | Notes |
|---------|:------:|-------|
| Tables | ✅ | Full GFM support |
| Math | ✅ | KaTeX rendering |
| Mermaid | ✅ | Diagrams & charts |
| Callouts | ✅ | GitHub-style |
| Highlight | ✅ | 190+ languages |

## 📌 Callouts

> [!NOTE]
> This is a note callout for general information.

> [!TIP]
> Pro tip: Use callouts to draw attention to important details.

> [!WARNING]
> Be careful with this operation — it cannot be undone.

> [!CAUTION]
> This action is destructive and irreversible.

> [!IMPORTANT]
> Critical information that users need to know.

## ✅ Task Lists

- [x] Markdown parsing
- [x] Live preview
- [x] Syntax highlighting
- [x] Math rendering
- [x] Mermaid diagrams
- [ ] Export to PDF
- [ ] Collaborative editing

---

> Start typing to replace this sample.
`

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [sanitizedHtml, setSanitizedHtml] = useState('')
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split')
  const { copied: copiedMd, copy: copyMd } = useClipboardCopy(2000)
  const { copied: copiedHtml, copy: copyHtml } = useClipboardCopy(2000)
  const [fileName, setFileName] = useState<string | null>(null)

  // Desktop: Finder drag-drop and "Open with DevToolbox" on a .md file.
  const loadFile = async (file: File) => { setMarkdown(await file.text()); setFileName(file.name) }
  useNativeDrop(items => { if (items[0]) loadFile(items[0].file) })
  useOpenedFile('/markdown-preview', loadFile)

  // Draggable split
  const [splitPercent, setSplitPercent] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplitPercent(Math.min(80, Math.max(20, pct)))
    }
    const onUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    mermaidCounter = 0
    mermaidSource.clear()
    const { frontmatter, body } = stripFrontmatter(markdown)

    let raw = marked(body) as string
    raw = renderMath(raw)

    // Prepend frontmatter table
    if (frontmatter && Object.keys(frontmatter).length > 0) {
      raw = renderFrontmatterHtml(frontmatter) + raw
    }

    const sanitized = DOMPurify.sanitize(raw, SANITIZE_CONFIG)
    setSanitizedHtml(sanitized)
  }, [markdown])

  // Render mermaid diagrams after HTML update
  useEffect(() => {
    if (!previewRef.current) return
    const blocks = previewRef.current.querySelectorAll('.mermaid-block')
    blocks.forEach(async (el) => {
      const id = el.getAttribute('data-mermaid-id') || ''
      const code = mermaidSource.get(id) ?? el.textContent ?? ''
      if (!code.trim() || el.querySelector('svg')) return
      try {
        const { svg } = await mermaid.render(`${id}-svg`, code)
        el.innerHTML = svg
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        el.textContent = ''
        const pre = document.createElement('pre')
        pre.style.cssText = 'color:#f87171;font-size:12px;white-space:pre-wrap'
        pre.textContent = `Mermaid error: ${msg}`
        el.appendChild(pre)
      }
    })
  }, [sanitizedHtml])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(md|markdown|mdx|txt)$/i)) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string') setMarkdown(text)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const editorPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: view === 'split' ? 'none' : 1, minHeight: 0, width: view === 'split' ? `${splitPercent}%` : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="label" style={{ margin: 0 }}>Markdown</label>
          {fileName && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>
              {fileName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => fileInputRef.current?.click()} className="copy-btn">Open File</button>
          <button onClick={() => copyMd(markdown)} className="copy-btn">{copiedMd ? '✓ Copied' : 'Copy MD'}</button>
        </div>
      </div>
      <textarea
        value={markdown}
        onChange={e => { setMarkdown(e.target.value); setFileName(null) }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="tool-textarea"
        style={{ flex: 1, minHeight: 0, resize: 'none', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7 }}
        spellCheck={false}
        placeholder="Type markdown or drop a .md file here…"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.mdx,.txt"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )

  const previewPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: view === 'split' ? 1 : 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <label className="label" style={{ margin: 0 }}>Preview</label>
        <button onClick={() => copyHtml(sanitizedHtml)} className="copy-btn">{copiedHtml ? '✓ Copied' : 'Copy HTML'}</button>
      </div>
      {/* sanitizedHtml is DOMPurify-sanitized before being set — XSS-safe */}
      <div
        ref={previewRef}
        style={{
          flex: 1, minHeight: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 28px',
          overflowY: 'auto',
          overflowX: 'hidden',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          lineHeight: 1.8,
          color: 'var(--text)',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
        className="md-preview"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  )

  return (
    <ToolLayout title="Markdown Preview" description="Live Markdown editor with real-time rendered preview." fullWidth>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {(['split', 'editor', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={view === v ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {view === 'split' ? (
          <div ref={containerRef} className="md-split" style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0 }}>
            {editorPanel}
            {/* Drag handle */}
            <div
              className="md-drag"
              onMouseDown={onMouseDown}
              style={{
                width: 8, cursor: 'col-resize', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
              }}
            >
              <div style={{
                width: 3, height: 40, borderRadius: 2,
                background: 'var(--border)',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent, #7eb8c9)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--border)')}
              />
            </div>
            {previewPanel}
          </div>
        ) : view === 'editor' ? editorPanel : previewPanel}
      </div>
    </ToolLayout>
  )
}
