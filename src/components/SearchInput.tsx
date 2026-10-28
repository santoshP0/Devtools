import React, { forwardRef, useRef } from 'react'
import { Search, X } from 'lucide-react'

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  iconSize?: number
  icon?: React.ReactNode | false
  size?: 'small' | 'medium'
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
    icon,
    size = 'medium',
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
  forwardedRef
) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && value) {
      e.preventDefault()
      e.stopPropagation()
      onChange('')
      onClear?.()
      return
    }
    onKeyDown?.(e)
  }

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onChange('')
    onClear?.()
    inputRef.current?.focus()
  }

  return (
    <div
      className={`search-input-wrapper search-input-${size} ${containerClassName || ''}`}
      style={containerStyle}
    >
      {icon !== false && (
        <span className="search-input-leading" aria-hidden="true">
          {icon ?? <Search size={iconSize} />}
        </span>
      )}
      <input
        ref={setInputRef}
        type="search"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`search-input-control input-bare ${className || ''}`}
        style={style}
        {...rest}
      />
      {badge && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {badge}
        </div>
      )}
      {showClear && value && (
        <button
          type="button"
          onClick={handleClear}
          className="search-input-clear btn-icon"
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={iconSize} />
        </button>
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
