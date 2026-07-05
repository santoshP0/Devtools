import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

const ACCENT_MAP: Record<string, string> = {
  à:'a',á:'a',â:'a',ã:'a',ä:'a',å:'a',æ:'ae',ç:'c',è:'e',é:'e',ê:'e',ë:'e',
  ì:'i',í:'i',î:'i',ï:'i',ð:'d',ñ:'n',ò:'o',ó:'o',ô:'o',õ:'o',ö:'o',ø:'o',
  ù:'u',ú:'u',û:'u',ü:'u',ý:'y',þ:'th',ÿ:'y',ß:'ss',
}

function slugify(str: string, sep: string): string {
  return str
    .toLowerCase()
    .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿß]/g, c => ACCENT_MAP[c] ?? c)
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, sep)
}

export default function Slugify() {
  const [input, setInput] = useState('')
  const [sep, setSep] = useState('-')
  const { copied, copy } = useClipboardCopy()

  const result = input ? slugify(input, sep) : ''

  return (
    <ToolLayout title="Slugify" description="Convert text to URL-friendly slugs.">
      <div className="flex flex-col gap-4 flex-1">
        <div className="tool-panel flex gap-4 items-center flex-wrap">
          <div>
            <label className="label">Separator</label>
            <div className="flex gap-2">
              {['-', '_', '.'].map(s => (
                <button key={s} onClick={() => setSep(s)} className={sep === s ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
                  <span className="font-mono">{s === '-' ? 'hyphen (-)' : s === '_' ? 'underscore (_)' : 'dot (.)'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col flex-1">
            <label className="label">Input Text</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Hello World! This is a Blog Post Title…"
              className="tool-textarea flex-1"
              spellCheck={false}
            />
          </div>

          <div className="tool-panel">
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Slug</label>
              {result && <button onClick={() => copy(result)} className="copy-btn">{copied ? '✓ Copied' : 'Copy'}</button>}
            </div>
            <div className="font-mono text-lg text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[48px] break-all">
              {result || <span className="text-slate-400">slug will appear here…</span>}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
