import { createContext, useContext, useState, useCallback, useRef } from 'react'

interface Toast {
  id: number
  message: string
}

interface ToastCtx {
  show: (message: string) => void
}

const ToastContext = createContext<ToastCtx>({ show: () => {} })

export const useToast = () => useContext(ToastContext)

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const show = useCallback((message: string) => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message }])
    const t = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timers.current.delete(id)
    }, 2000)
    timers.current.set(id, t)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
        }}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              style={{
                background: 'var(--sketch-text, #1a1a1a)',
                color: 'var(--sketch-bg, #f5efe6)',
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                animation: 'toast-in 0.25s ease-out',
              }}
            >
              <span style={{ fontSize: 15 }}>&#10003;</span>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
