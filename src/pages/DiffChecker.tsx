import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react'
import { monaco, EDITOR_DEFAULTS } from '../lib/monacoSetup'
import { useIsDark } from '../hooks/useIsDark'
import { useNativeDrop } from '../hooks/useNativeDrop'

export default function DiffChecker() {
  const [sideBySide, setSideBySide] = useState(true)
  const isDark = useIsDark()
  const [stats, setStats] = useState({ add: 0, del: 0 })
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
  const fileLRef = useRef<HTMLInputElement>(null)
  const fileRRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState<'left' | 'right' | null>(null)

  const onMount: DiffOnMount = (editor) => {
    editorRef.current = editor
    // Force BOTH panes to the same wrap. monaco-react doesn't reliably propagate
    // options.wordWrap to both sub-editors, so one pane wrapped and the other
    // didn't — misaligning lines and rendering identical files as a phantom diff.
    // 'off' also avoids the 10k-line reflow that froze the tab.
    editor.getOriginalEditor().updateOptions({ wordWrap: 'off' })
    editor.getModifiedEditor().updateOptions({ wordWrap: 'off' })
    editor.onDidUpdateDiff(() => {
      let add = 0, del = 0
      for (const c of editor.getLineChanges() ?? []) {
        if (c.originalEndLineNumber > 0) del += c.originalEndLineNumber - c.originalStartLineNumber + 1
        if (c.modifiedEndLineNumber > 0) add += c.modifiedEndLineNumber - c.modifiedStartLineNumber + 1
      }
      setStats({ add, del })
    })
  }

  const models = () => {
    const m = editorRef.current?.getModel()
    return m ? { orig: m.original, mod: m.modified } : null
  }

  const clear = () => { const m = models(); m?.orig.setValue(''); m?.mod.setValue('') }

  const swap = () => {
    const m = models(); if (!m) return
    const a = m.orig.getValue(); m.orig.setValue(m.mod.getValue()); m.mod.setValue(a)
  }

  const copySide = (side: 'left' | 'right') => {
    const m = models(); if (!m) return
    navigator.clipboard.writeText(side === 'left' ? m.orig.getValue() : m.mod.getValue())
    setCopied(side)
    setTimeout(() => setCopied(null), 1500)
  }

  const openFile = (side: 'left' | 'right') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      const m = models(); if (!m) return
      ;(side === 'left' ? m.orig : m.mod).setValue(r.result as string)
    }
    r.readAsText(f)
    e.target.value = ''
  }

  // Desktop: drop files from Finder to compare. Two files → left + right; one file
  // fills an empty pane. (HTML drag-drop is intercepted by Tauri, hence native.)
  useNativeDrop(async items => {
    const m = models(); if (!m || items.length === 0) return
    const texts = await Promise.all(items.slice(0, 2).map(it => it.file.text()))
    if (texts.length >= 2) { m.orig.setValue(texts[0]); m.mod.setValue(texts[1]); return }
    if (!m.orig.getValue().trim()) m.orig.setValue(texts[0])
    else if (!m.mod.getValue().trim()) m.mod.setValue(texts[0])
    else m.orig.setValue(texts[0])
  })

  const exportTxt = () => {
    const m = models(); if (!m) return
    const url = URL.createObjectURL(new Blob([m.mod.getValue()], { type: 'text/plain' }))
    const a = document.createElement('a'); a.href = url; a.download = 'merged.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  const pillBtn: React.CSSProperties = { padding: '4px 14px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, transition: 'background .15s,color .15s' }

  return (
    <ToolLayout title="Diff Checker" description="Compare two texts side by side — edit live, use the gutter arrows to merge changes." fullWidth>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* ════ TOP CONTROLS ════ */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <button onClick={clear} className="btn-ghost" style={{ fontSize: 13, padding: '4px 14px' }}>Clear</button>

          {/* Split / Unified pill */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
            {([['Split', true], ['Unified', false]] as const).map(([label, v]) => (
              <button key={label} onClick={() => setSideBySide(v)} style={{ ...pillBtn, background: sideBySide === v ? 'var(--accent)' : 'var(--surface)', color: sideBySide === v ? '#fff' : 'var(--text-muted)' }}>{label}</button>
            ))}
          </div>

          <button onClick={swap} className="btn-ghost" style={{ fontSize: 13, padding: '4px 14px' }} title="Swap sides">⇄ Swap</button>

          {(stats.add > 0 || stats.del > 0) && (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-sans)', display: 'flex', gap: 10 }}>
              <span style={{ color: 'oklch(0.62 0.18 25)', fontWeight: 600 }}>−{stats.del} removals</span>
              <span style={{ color: 'oklch(0.55 0.15 145)', fontWeight: 600 }}>+{stats.add} additions</span>
            </span>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => fileLRef.current?.click()} className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }}>Open Left…</button>
            <button onClick={() => fileRRef.current?.click()} className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }}>Open Right…</button>
            <button onClick={() => copySide('left')} className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }}>{copied === 'left' ? '✓ Copied' : 'Copy Left'}</button>
            <button onClick={() => copySide('right')} className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }}>{copied === 'right' ? '✓ Copied' : 'Copy Right'}</button>
            <button onClick={exportTxt} className="btn-ghost" style={{ fontSize: 13, padding: '4px 14px', color: 'var(--accent)' }}>↓ Export .txt</button>
          </div>
          <input ref={fileLRef} type="file" style={{ display: 'none' }} onChange={openFile('left')} />
          <input ref={fileRRef} type="file" style={{ display: 'none' }} onChange={openFile('right')} />
        </div>

        {/* ════ DIFF EDITOR ════ */}
        <div style={{ flex: 1, minHeight: 'min(65dvh, 560px)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <DiffEditor
            height="100%"
            language="plaintext"
            theme={isDark ? 'vs-dark' : 'vs'}
            original={''}
            modified={''}
            onMount={onMount}
            options={{
              ...EDITOR_DEFAULTS,
              originalEditable: true,
              renderSideBySide: sideBySide,
              renderMarginRevertIcon: false,
              renderOverviewRuler: true,
              diffAlgorithm: 'advanced',
              // Collapse unchanged regions — only changed lines render, so two big
              // mostly-similar files stay fast instead of laying out every line.
              hideUnchangedRegions: { enabled: true, contextLineCount: 3, minimumLineCount: 4 },
              wordWrap: 'off',
              minimap: { enabled: false },
              placeholder: 'Paste or type original text…',
            }}
          />
        </div>
      </div>
    </ToolLayout>
  )
}
