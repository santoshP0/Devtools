import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

type Format = 'binary' | 'hex' | 'octal' | 'decimal' | 'utf8codes'

function textToFormat(text: string, fmt: Format): string {
  const bytes = new TextEncoder().encode(text)
  switch (fmt) {
    case 'binary':
      return Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' ')
    case 'hex':
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    case 'octal':
      return Array.from(bytes).map(b => b.toString(8).padStart(3, '0')).join(' ')
    case 'decimal':
      return Array.from(bytes).join(' ')
    case 'utf8codes':
      return Array.from(text).map(c => c.codePointAt(0)).join(' ')
  }
}

function formatToText(encoded: string, fmt: Format): string {
  const parts = encoded.trim().split(/\s+/).filter(Boolean)
  let bytes: number[]
  switch (fmt) {
    case 'binary':
      bytes = parts.map(p => parseInt(p, 2))
      break
    case 'hex':
      bytes = parts.map(p => parseInt(p, 16))
      break
    case 'octal':
      bytes = parts.map(p => parseInt(p, 8))
      break
    case 'decimal':
      bytes = parts.map(p => parseInt(p, 10))
      break
    case 'utf8codes':
      return parts.map(p => String.fromCodePoint(parseInt(p, 10))).join('')
  }
  if (bytes.some(isNaN)) throw new Error('Invalid input')
  return new TextDecoder().decode(new Uint8Array(bytes))
}

const FORMATS: { id: Format; label: string; example: string }[] = [
  { id: 'binary', label: 'Binary', example: '01001000 01101001' },
  { id: 'hex', label: 'Hex', example: '48 69' },
  { id: 'octal', label: 'Octal', example: '110 151' },
  { id: 'decimal', label: 'Decimal (bytes)', example: '72 105' },
  { id: 'utf8codes', label: 'Unicode Code Points', example: '72 105' },
]

export default function TextBinaryHex() {
  const [text, setText] = useState('Hello')
  const [format, setFormat] = useState<Format>('binary')
  const [encoded, setEncoded] = useState('')
  const [decodeInput, setDecodeInput] = useState('')
  const [decoded, setDecoded] = useState('')
  const [decodeError, setDecodeError] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [copiedKey, setCopiedKey] = useState('')

  const encode = () => {
    const result = textToFormat(text, format)
    setEncoded(result)
  }

  const decode = () => {
    setDecodeError('')
    try {
      setDecoded(formatToText(decodeInput, format))
    } catch (e) {
      setDecodeError((e as Error).message)
      setDecoded('')
    }
  }

  const copy = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1500)
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px 18px',
  }
  const taStyle: React.CSSProperties = {
    width: '100%', padding: 12, resize: 'none', minHeight: 100,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)',
    fontSize: 13, lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <ToolLayout title="Text ↔ Binary / Hex" description="Encode text to binary, hexadecimal, octal or decimal byte values, and decode back.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['encode', 'decode'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={mode === m ? 'btn-primary' : 'btn-secondary'} style={{ textTransform: 'capitalize' }}>
              {m === 'encode' ? 'Text → Encoding' : 'Encoding → Text'}
            </button>
          ))}
        </div>

        {/* Format selector */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Format
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => { setFormat(f.id); setEncoded(''); setDecoded(''); setDecodeError('') }}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: format === f.id ? 'var(--accent)' : 'var(--surface2)',
                  color: format === f.id ? 'var(--bg)' : 'var(--text-dim)',
                  border: `1.5px solid ${format === f.id ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Example: <code>"Hi" → {FORMATS.find(f => f.id === format)?.example}</code>
          </div>
        </div>

        {mode === 'encode' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>Text Input</div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Enter text to encode…"
                style={{ ...taStyle, minHeight: 140 }}
                spellCheck={false}
              />
              <button onClick={encode} className="btn-primary" style={{ marginTop: 8 }}>
                Encode →
              </button>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>{FORMATS.find(f => f.id === format)?.label}</span>
                {encoded && <button onClick={() => copy('enc', encoded)} className="copy-btn">{copiedKey === 'enc' ? '✓ Copied' : 'Copy'}</button>}
              </div>
              <textarea value={encoded} readOnly style={{ ...taStyle, minHeight: 140, background: 'var(--surface)' }} spellCheck={false} />
              {encoded && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  {text.length} chars → {encoded.split(' ').length} {format === 'binary' ? 'bytes' : 'values'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
                {FORMATS.find(f => f.id === format)?.label} Input
              </div>
              <textarea
                value={decodeInput}
                onChange={e => setDecodeInput(e.target.value)}
                placeholder={`Paste ${format} values separated by spaces…`}
                style={{ ...taStyle, minHeight: 140 }}
                spellCheck={false}
              />
              <button onClick={decode} className="btn-primary" style={{ marginTop: 8 }}>
                Decode →
              </button>
              {decodeError && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'oklch(0.80 0.16 25)' }}>✗ {decodeError}</div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Decoded Text</span>
                {decoded && <button onClick={() => copy('dec', decoded)} className="copy-btn">{copiedKey === 'dec' ? '✓ Copied' : 'Copy'}</button>}
              </div>
              <textarea value={decoded} readOnly style={{ ...taStyle, minHeight: 140, background: 'var(--surface)' }} spellCheck={false} />
            </div>
          </div>
        )}

        {/* Quick encode all */}
        {mode === 'encode' && text && (
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              All formats at once
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FORMATS.map(f => {
                const val = textToFormat(text, f.id)
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 140, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>{f.label}</span>
                    <code style={{ flex: 1, fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{val}</code>
                    <button onClick={() => copy(f.id, val)} className="copy-btn" style={{ flexShrink: 0 }}>
                      {copiedKey === f.id ? '✓' : 'Copy'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
