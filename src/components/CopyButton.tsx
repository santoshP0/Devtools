import React, { useState, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import { useToast } from './Toast'

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text to copy, or a function that returns the text (sync or async) */
  text: string | (() => string | Promise<string>)
  /** Button label when idle (default: 'Copy') */
  label?: React.ReactNode
  /** Button label when copied (default: 'Copied!') */
  copiedLabel?: React.ReactNode
  /** Toast message shown on copy. Set to false to disable toast. Default: 'Copied to clipboard' */
  toastMessage?: string | false
  /** Variant:
   * - 'default': standard tool button matching .copy-btn styling
   * - 'icon': compact inline icon button for trees, tables, badges
   * - 'ghost': minimal ghost button
   */
  variant?: 'default' | 'icon' | 'ghost'
  /** Size for icon (default: 12 for default/ghost, 11 for icon) */
  iconSize?: number
  /** Custom icon to show when idle instead of Copy (e.g. Route icon for JSON paths) */
  customIcon?: React.ReactNode
  /** Duration to show copied state in ms (default: 1600) */
  timeout?: number
}

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  toastMessage = 'Copied to clipboard',
  variant = 'default',
  iconSize,
  customIcon,
  timeout = 1600,
  className = '',
  style,
  title,
  disabled,
  onClick,
  ...rest
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const toast = useToast()

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onClick?.(e)

    try {
      const textToCopy = typeof text === 'function' ? await text() : text
      if (textToCopy === undefined || textToCopy === null) return

      await navigator.clipboard.writeText(String(textToCopy))
      setCopied(true)

      if (toastMessage) {
        toast.show(toastMessage)
      }

      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setCopied(false)
      }, timeout)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const defaultIconSize = variant === 'icon' ? 11 : 12
  const size = iconSize ?? defaultIconSize

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied to clipboard!' : (title || (typeof label === 'string' ? label : 'Copy'))}
        className={`copy-btn-icon ${copied ? 'is-copied' : ''} ${className}`}
        style={{
          border: 'none',
          background: copied ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
          color: copied ? '#16a34a' : undefined,
          padding: '2px 5px',
          borderRadius: 4,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          lineHeight: 1,
          transition: 'all 0.15s ease',
          ...style,
        }}
        {...rest}
      >
        {copied ? (
          <Check size={size} style={{ color: '#16a34a', strokeWidth: 2.5 }} />
        ) : (
          customIcon || <Copy size={size} />
        )}
        {copied && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a' }}>
            Copied!
          </span>
        )}
      </button>
    )
  }

  if (variant === 'ghost') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleCopy}
        title={title || (copied ? 'Copied to clipboard!' : undefined)}
        className={`btn-ghost ${copied ? 'is-copied' : ''} ${className}`}
        style={{
          color: copied ? '#16a34a' : undefined,
          borderColor: copied ? '#16a34a' : undefined,
          background: copied ? 'rgba(34, 197, 94, 0.12)' : undefined,
          ...style,
        }}
        {...rest}
      >
        {copied ? (
          <Check size={size} style={{ color: '#16a34a', strokeWidth: 2.5 }} />
        ) : (
          customIcon || <Copy size={size} />
        )}
        <span>{copied ? copiedLabel : label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleCopy}
      title={title || (copied ? 'Copied to clipboard!' : undefined)}
      className={`copy-btn ${copied ? 'is-copied' : ''} ${className}`}
      style={{
        borderColor: copied ? '#16a34a' : undefined,
        background: copied ? 'rgba(34, 197, 94, 0.12)' : undefined,
        color: copied ? '#16a34a' : undefined,
        boxShadow: copied ? '1.5px 1.5px 0px #16a34a' : undefined,
        ...style,
      }}
      {...rest}
    >
      {copied ? (
        <Check size={size} style={{ color: '#16a34a', strokeWidth: 2.5 }} />
      ) : (
        customIcon || <Copy size={size} />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  )
}

export default CopyButton
