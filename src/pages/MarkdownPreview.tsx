import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const SAMPLE = `# 🚀 Project Documentation

> A complete markdown sample with most commonly used features.

---

## Table of Contents

1. Introduction
2. Installation
3. Features
4. Code Examples
5. Tables
6. Task Lists
7. Quotes
8. Images
9. Nested Lists
10. Advanced Markdown

---

# Introduction

Markdown is a lightweight markup language used for documentation, notes, blogs, README files, and more.

**Bold Text**
*Italic Text*
**Bold + Italic**
~~Strikethrough~~
\`inline code\`

## Installation

\`\`\`bash
npm install marked dompurify
\`\`\`

## Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

## Tables

| Feature     | Support |
|-------------|---------|
| Bold/Italic | ✓       |
| Tables      | ✓       |
| Code blocks | ✓       |
| Task lists  | ✓       |

## Task List

- [x] Set up project
- [x] Write documentation
- [ ] Deploy to production
- [ ] Add tests

## Blockquote

> "The best documentation is the one that doesn't need to be read."
> — Someone wise

## Nested Lists

- Item 1
  - Sub-item 1.1
  - Sub-item 1.2
    - Deep item
- Item 2
- Item 3
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

  const PANEL_H = 'calc(100dvh - 54px - 58px - 96px)'

  const editorPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label className="label" style={{ margin: 0 }}>Markdown</label>
        <button onClick={copyMd} className="copy-btn">{copiedMd ? '✓ Copied' : 'Copy MD'}</button>
      </div>
      <textarea
        value={markdown}
        onChange={e => setMarkdown(e.target.value)}
        className="tool-textarea"
        style={{ flex: 1, minHeight: PANEL_H, resize: 'none', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7 }}
        spellCheck={false}
      />
    </div>
  )

  const previewPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label className="label" style={{ margin: 0 }}>Preview</label>
        <button onClick={copyHtml} className="copy-btn">{copiedHtml ? '✓ Copied' : 'Copy HTML'}</button>
      </div>
      {/* sanitizedHtml is DOMPurify-sanitized before being set — XSS-safe */}
      <div
        style={{
          flex: 1, minHeight: PANEL_H,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['split', 'editor', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={view === v ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {view === 'split' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>
            {editorPanel}
            {previewPanel}
          </div>
        ) : view === 'editor' ? editorPanel : previewPanel}
      </div>
    </ToolLayout>
  )
}
