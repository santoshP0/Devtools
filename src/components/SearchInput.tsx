import React, { forwardRef } from 'react'
import { Search, X } from 'lucide-react'

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  iconSize?: number
  showClear?: boolean
  badge?: React.ReactNode
  rightSlot?: React.ReactNode
  containerStyle?: React.CSSProperties
  containerClassName?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    onClear,
    placeholder = 'Search…',
    iconSize = 13,
    showClear = true,
    badge,
    rightSlot,
    containerStyle,
    containerClassName,
    className,
    style,
    onKeyDown,
    autoFocus,
    ...rest
  },
  ref
) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && onClear && value) {
      e.stopPropagation()
      onClear()
    }
    onKeyDown?.(e)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    onClear?.()
  }

  return (
    <div
      className={`search-input-wrapper ${containerClassName || ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 8px',
        borderRadius: 6,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...containerStyle,
      }}
    >
      <Search
        size={iconSize}
        style={{ color: 'var(--text-muted)', flexShrink: 0, pointerEvents: 'none' }}
      />
      <input
        ref={ref}
        type="text"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`search-input-control input-bare ${className || ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'inherit',
          fontSize: 12,
          padding: 0,
          margin: 0,
          boxShadow: 'none',
          transform: 'none',
          fontFamily: 'inherit',
          lineHeight: '1.4',
          ...style,
        }}
        {...rest}
      />
      {badge && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {badge}
        </div>
      )}
      {showClear && value && (
        <span
          role="button"
          tabIndex={0}
          onClick={handleClear}
          title="Clear"
          style={{
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1px 2px',
            borderRadius: 3,
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <X size={iconSize} />
        </span>
      )}
      {rightSlot && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {rightSlot}
        </div>
      )}
    </div>
  )
})

export default SearchInput
