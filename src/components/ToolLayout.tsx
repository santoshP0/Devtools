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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4">
          ← All tools
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      {children}
    </div>
  )
}
