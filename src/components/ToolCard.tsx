import { Link } from 'react-router-dom'
import { Tool } from '../lib/tools'

const categoryColors: Record<string, string> = {
  Data: 'bg-blue-100 text-blue-700',
  Security: 'bg-red-100 text-red-700',
  Media: 'bg-purple-100 text-purple-700',
  Generator: 'bg-green-100 text-green-700',
  Text: 'bg-amber-100 text-amber-700',
  Design: 'bg-pink-100 text-pink-700',
}

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      to={`/${tool.slug}`}
      className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex items-start gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-500 text-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
        {tool.icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
            {tool.name}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[tool.category] ?? 'bg-slate-100 text-slate-600'}`}>
            {tool.category}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{tool.description}</p>
      </div>
    </Link>
  )
}
