import { useClipboardCopy } from '../hooks/useClipboardCopy'

export default function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const { copied, copy } = useClipboardCopy()
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => copy(text)}>
      {copied ? '✓ Copied' : label}
    </button>
  )
}
