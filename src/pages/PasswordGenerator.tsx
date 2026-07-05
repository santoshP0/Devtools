import { useState, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

const CHARS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

function strength(pwd: string) {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (pwd.length >= 16) score++
  if (/[a-z]/.test(pwd)) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  if (score <= 3) return { label: 'Weak', color: 'bg-red-500', w: '33%' }
  if (score <= 5) return { label: 'Good', color: 'bg-yellow-500', w: '66%' }
  return { label: 'Strong', color: 'bg-green-500', w: '100%' }
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16)
  const [opts, setOpts] = useState({ lower: true, upper: true, numbers: true, symbols: false })
  const [count, setCount] = useState(1)
  const [passwords, setPasswords] = useState<string[]>([])
  const { copied, copy } = useClipboardCopy()

  const generate = useCallback(() => {
    const pool = Object.entries(opts).filter(([, v]) => v).map(([k]) => CHARS[k as keyof typeof CHARS]).join('')
    if (!pool) return
    const arr = Array.from({ length: count }, () =>
      Array.from(crypto.getRandomValues(new Uint8Array(length))).map(b => pool[b % pool.length]).join('')
    )
    setPasswords(arr)
  }, [length, opts, count])

  const toggle = (key: keyof typeof opts) => setOpts(o => ({ ...o, [key]: !o[key] }))

  return (
    <ToolLayout title="Password Generator" description="Generate strong, random passwords in your browser.">
      <div className="space-y-5 bg-white border border-slate-200 rounded-xl p-6">
        <div>
          <div className="flex justify-between mb-1">
            <label className="label">Length</label>
            <span className="text-sm font-mono font-bold text-blue-600">{length}</span>
          </div>
          <input type="range" min={6} max={128} value={length} onChange={e => setLength(Number(e.target.value))} className="w-full accent-blue-600" />
          <div className="flex justify-between text-xs text-slate-400 mt-1"><span>6</span><span>128</span></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(opts) as (keyof typeof opts)[]).map(key => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={opts[key]} onChange={() => toggle(key)} className="accent-blue-600" />
              <span className="capitalize">{key}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="label">Generate</label>
          <div className="flex items-center gap-2">
            {[1, 5, 10].map(n => (
              <button key={n} onClick={() => setCount(n)} className={count === n ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
                {n} {n === 1 ? 'password' : 'passwords'}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} className="btn-primary w-full">Generate</button>

        {passwords.length > 0 && (
          <div className="space-y-2">
            {passwords.map((pwd, i) => {
              const s = strength(pwd)
              return (
                <div key={i} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-sm text-slate-800 break-all mr-4">{pwd}</span>
                    <button onClick={() => copy(pwd, pwd)} className="copy-btn flex-shrink-0">
                      {copied === pwd ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} transition-all`} style={{ width: s.w }} />
                    </div>
                    <span className="text-xs text-slate-500">{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
