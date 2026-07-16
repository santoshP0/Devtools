import Editor, { type OnMount } from '@monaco-editor/react'
import { EDITOR_DEFAULTS } from '../lib/monacoSetup'
import { useIsDark } from '../hooks/useIsDark'

interface Props {
  language: string
  value: string
  onChange: (v: string) => void
  onMount?: OnMount
  placeholder?: string
  options?: Record<string, unknown>
}

/** Themed Monaco editor in a bordered box; parent controls size (flex/height). */
export default function CodeEditor({ language, value, onChange, onMount, placeholder, options }: Props) {
  const isDark = useIsDark()
  return (
    <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <Editor
        height="100%"
        language={language}
        theme={isDark ? 'vs-dark' : 'vs'}
        value={value}
        onChange={v => onChange(v ?? '')}
        onMount={onMount}
        options={{ ...EDITOR_DEFAULTS, placeholder, ...options }}
      />
    </div>
  )
}
