import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const SAMPLE = `# Hello, Markdown!

Write your **markdown** here and see a live *preview* on the right.

## Features

- **Bold**, *italic*, ~~strikethrough~~, \`inline code\`
- [Links](https://example.com) and > blockquotes
- Tables, task lists, code blocks

## Example

\`\`\`js
console.log("Hello, world!");
\`\`\`

> Start typing to replace this sample.
`

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [sanitizedHtml, setSanitizedHtml] = useState('')
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split')
  const [copiedMd, setCopiedMd] = useState(false)
  const [copiedHtml, setCopiedHtml] = useState(false)

  useEffect(() => {
    // marked output is sanitized via DOMPurify before rendering
    const raw = marked(markdown) as string
    setSanitizedHtml(DOMPurify.sanitize(raw))
  }, [markdown])

  const copyMd = () => {
    navigator.clipboard.writeText(markdown)
    setCopiedMd(true)
    setTimeout(() => setCopiedMd(false), 2000)
  }
  const copyHtml = () => {
    navigator.clipboard.writeText(sanitizedHtml)
    setCopiedHtml(true)
    setTimeout(() => setCopiedHtml(false), 2000)
  }

  const editorPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <label className="label" style={{ margin: 0 }}>Markdown</label>
        <button onClick={copyMd} className="copy-btn">{copiedMd ? '✓ Copied' : 'Copy MD'}</button>
      </div>
      <textarea
        value={markdown}
        onChange={e => setMarkdown(e.target.value)}
        className="tool-textarea"
        style={{ flex: 1, minHeight: 0, resize: 'none', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7 }}
        spellCheck={false}
      />
    </div>
  )

  const previewPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <label className="label" style={{ margin: 0 }}>Preview</label>
        <button onClick={copyHtml} className="copy-btn">{copiedHtml ? '✓ Copied' : 'Copy HTML'}</button>
      </div>
      {/* sanitizedHtml is DOMPurify-sanitized before being set — XSS-safe */}
      <div
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
            {editorPanel}
            {previewPanel}
          </div>
        ) : view === 'editor' ? editorPanel : previewPanel}
      </div>
    </ToolLayout>
  )
}
