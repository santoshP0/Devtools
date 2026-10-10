import { useState, useRef, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { isTauri } from '@tauri-apps/api/core'
import { useTauriFileDrop } from '../hooks/useTauriFileDrop'
import { UploadCloud, FileCode2, Film, Image as ImageIcon, X, RefreshCw } from 'lucide-react'

export interface FileDropZoneProps {
  /** Selected file path or filename */
  value?: string | null
  /** Optional file size in bytes */
  fileSize?: number
  /** Callback when user clicks or drops a file (browser File object and/or path) */
  onFileSelect?: (file: File, path?: string) => void
  /** Callback when multiple files are dropped/selected */
  onFilesSelect?: (files: File[], paths?: string[]) => void
  /** Native Tauri file open dialog action (e.g. pick() using @tauri-apps/plugin-dialog) */
  onPick?: () => void
  /** Callback to clear current selection */
  onClear?: () => void
  /** List of accepted file extensions (lowercase, without dot: ['mp4', 'mov', 'png']) */
  accept?: string[]
  /** HTML file input accept attribute (e.g. 'video/*,image/*') */
  acceptMime?: string
  /** Allow selecting multiple files */
  multiple?: boolean
  /** Primary headline text */
  title?: string
  /** Secondary subtitle / hint text */
  subtitle?: string
  /** Custom icon */
  icon?: ReactNode
  /** Compact sizing for smaller sidebars */
  compact?: boolean
  /** Disabled state */
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

export default function FileDropZone({
  value,
  fileSize,
  onFileSelect,
  onFilesSelect,
  onPick,
  onClear,
  accept = [],
  acceptMime,
  multiple = false,
  title = 'Choose file or drag & drop here',
  subtitle,
  icon,
  compact = false,
  disabled = false,
  style,
  className = '',
}: FileDropZoneProps) {
  const [htmlDragging, setHtmlDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Native Tauri drag & drop listener (for desktop)
  const { dragging: tauriDragging } = useTauriFileDrop(
    path => {
      if (disabled) return
      const name = path.split(/[\\/]/).pop() || 'file'
      const file = new File([], name)
      onFileSelect?.(file, path)
      onFilesSelect?.([file], [path])
    },
    accept.length > 0 ? accept : undefined,
  )

  const isDragging = !disabled && (htmlDragging || tauriDragging)

  // HTML5 Drag & Drop handlers (for browser web)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setHtmlDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setHtmlDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setHtmlDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (!droppedFiles || droppedFiles.length === 0) return

    const filesArray = Array.from(droppedFiles)
    if (multiple) {
      onFilesSelect?.(filesArray)
      if (filesArray[0]) onFileSelect?.(filesArray[0])
    } else {
      onFileSelect?.(filesArray[0])
      onFilesSelect?.([filesArray[0]])
    }
  }, [disabled, multiple, onFileSelect, onFilesSelect])

  const handleClick = useCallback(async () => {
    if (disabled) return
    if (onPick) {
      onPick()
      return
    }
    if (isTauri() && accept.length > 0) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog')
        const res = await open({
          title,
          multiple,
          filters: [{
            name: title || 'Supported Files',
            extensions: accept,
          }],
        })
        if (!res) return
        const paths = Array.isArray(res) ? res : [res]
        const { invoke } = await import('@tauri-apps/api/core')
        const files: File[] = []
        for (const p of paths) {
          const name = p.split(/[\\/]/).pop() || 'file'
          try {
            const buf = await invoke<ArrayBuffer>('read_file', { path: p })
            files.push(new File(buf ? [buf as BlobPart] : [], name))
          } catch {
            files.push(new File([], name))
          }
        }
        if (multiple) {
          onFilesSelect?.(files, paths)
          if (files[0]) onFileSelect?.(files[0], paths[0])
        } else {
          if (files[0]) onFileSelect?.(files[0], paths[0])
          onFilesSelect?.([files[0]], [paths[0]])
        }
        return
      } catch (err) {
        console.error('Native file dialog error:', err)
      }
    }
    inputRef.current?.click()
  }, [disabled, onPick, accept, multiple, title, onFileSelect, onFilesSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    if (multiple) {
      onFilesSelect?.(filesArray)
      if (filesArray[0]) onFileSelect?.(filesArray[0])
    } else {
      onFileSelect?.(filesArray[0])
      onFilesSelect?.([filesArray[0]])
    }

    if (inputRef.current) inputRef.current.value = ''
  }, [multiple, onFileSelect, onFilesSelect])

  // Derive file extension & appropriate icon
  const fileName = value ? value.split(/[\\/]/).pop() || value : ''
  const ext = fileName ? (fileName.split('.').pop() || '').toLowerCase() : ''
  const isVideo = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'].includes(ext)
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'svg'].includes(ext)

  const defaultSubtitle = accept.length > 0
    ? `Supports ${accept.map(a => a.toUpperCase()).slice(0, 6).join(', ')}${accept.length > 6 ? '…' : ''}`
    : 'Drop your file to process'

  return (
    <div
      data-drop-zone="true"
      style={{ width: '100%', position: 'relative', ...style }}
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden browser file input fallback */}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={acceptMime || (accept.length ? accept.map(a => `.${a}`).join(',') : undefined)}
        style={{ display: 'none' }}
        onChange={handleInputChange}
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {value ? (
          /* ── Selected File Card State ── */
          <motion.div
            key="file-selected-card"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{
              padding: compact ? '14px 18px' : '20px 24px',
              borderRadius: compact ? 16 : 20,
              background: 'var(--surface, #1e293b)',
              border: '1.5px solid var(--sketch-border, rgba(255, 255, 255, 0.14))',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Left: Icon and Filename */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: compact ? 42 : 50,
                  height: compact ? 42 : 50,
                  borderRadius: 14,
                  background: 'var(--accent, #6366f1)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 20px -4px rgba(99, 102, 241, 0.4)',
                }}
              >
                {isVideo ? (
                  <Film size={compact ? 20 : 24} strokeWidth={2} />
                ) : isImage ? (
                  <ImageIcon size={compact ? 20 : 24} strokeWidth={2} />
                ) : (
                  <FileCode2 size={compact ? 20 : 24} strokeWidth={2} />
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: compact ? 14 : 15,
                    fontWeight: 700,
                    color: 'var(--text, #f8fafc)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 3,
                  }}
                  title={fileName}
                >
                  {fileName}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: 'var(--text-muted, #94a3b8)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={value}
                >
                  {ext && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.08)',
                        fontWeight: 700,
                        fontSize: 10,
                        textTransform: 'uppercase',
                      }}
                    >
                      {ext}
                    </span>
                  )}
                  {fileSize ? (
                    <span>{(fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  ) : null}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}>
                    {value}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleClick}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: compact ? '6px 12px' : '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
                title="Choose a different file"
              >
                <RefreshCw size={13} />
                <span>Change</span>
              </button>

              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: compact ? 6 : 8,
                    borderRadius: 8,
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  title="Remove selected file"
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#ef4444'
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'
                    e.currentTarget.style.background = 'none'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── Empty / Drag Drop Zone State ── */
          <motion.div
            key="file-dropzone-empty"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: isDragging ? 1.015 : 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{
              padding: compact ? '24px 20px' : '40px 28px',
              borderRadius: compact ? 16 : 22,
              background: isDragging
                ? 'rgba(99, 102, 241, 0.08)'
                : 'var(--surface, #1e293b)',
              border: isDragging
                ? '2px dashed var(--accent, #6366f1)'
                : '2px dashed var(--sketch-border, rgba(255, 255, 255, 0.16))',
              boxShadow: isDragging
                ? '0 16px 40px -8px rgba(99, 102, 241, 0.35), 0 0 24px -2px rgba(99, 102, 241, 0.25)'
                : '0 8px 24px -6px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              cursor: disabled ? 'default' : 'pointer',
              userSelect: 'none',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              if (disabled || isDragging) return
              e.currentTarget.style.borderColor = 'var(--accent, #6366f1)'
              e.currentTarget.style.boxShadow = '0 12px 30px -8px rgba(99, 102, 241, 0.22)'
            }}
            onMouseLeave={e => {
              if (disabled || isDragging) return
              e.currentTarget.style.borderColor = 'var(--sketch-border, rgba(255, 255, 255, 0.16))'
              e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(0, 0, 0, 0.15)'
            }}
          >
            {/* Ambient subtle glow when dragging */}
            {isDragging && (
              <div
                style={{
                  position: 'absolute',
                  top: '-30%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 260,
                  height: 160,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.25), transparent 70%)',
                  filter: 'blur(25px)',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Icon Squircle Badge */}
            <div
              style={{
                width: compact ? 48 : 60,
                height: compact ? 48 : 60,
                borderRadius: compact ? 15 : 18,
                background: isDragging
                  ? 'var(--accent, #6366f1)'
                  : 'rgba(99, 102, 241, 0.12)',
                color: isDragging ? '#ffffff' : 'var(--accent, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: compact ? 12 : 16,
                boxShadow: isDragging
                  ? '0 10px 24px -4px rgba(99, 102, 241, 0.5)'
                  : 'none',
                transition: 'all 0.18s ease',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {icon || <UploadCloud size={compact ? 24 : 30} strokeWidth={2} />}
            </div>

            {/* Headlines */}
            <h3
              style={{
                fontSize: compact ? 15 : 17,
                fontWeight: 700,
                margin: '0 0 6px',
                color: 'var(--text, #f8fafc)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {isDragging ? 'Drop to load file' : title}
            </h3>

            <p
              style={{
                fontSize: compact ? 12 : 13,
                color: 'var(--text-muted, #94a3b8)',
                margin: 0,
                maxWidth: 400,
                lineHeight: 1.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {subtitle || defaultSubtitle}
            </p>

            {/* Supported format badges */}
            {accept.length > 0 && !compact && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 5,
                  marginTop: 16,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {accept.slice(0, 8).map(extName => (
                  <span
                    key={extName}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-muted, #94a3b8)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {extName}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
