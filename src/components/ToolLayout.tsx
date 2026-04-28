import { Link } from 'react-router-dom'
import { ReactNode, useEffect } from 'react'

interface Props {
  title: string
  description: string
  children: ReactNode
}

export default function ToolLayout({ title, description, children }: Props) {
  useEffect(() => {
    document.title = `${title} | DevToolbox`
    return () => { document.title = 'DevToolbox – Free Developer Tools' }
  }, [title])

  return (
    <div className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Tool header */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-10 lg:px-16 py-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors mb-4 group">
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          All tools
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      {/* Tool content */}
      <div className="flex-1 flex flex-col px-6 sm:px-10 lg:px-16 py-8">
        {children}
      </div>
    </div>
  )
}
