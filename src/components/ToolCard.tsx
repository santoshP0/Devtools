import { Link } from 'react-router-dom'
import { Tool } from '../lib/tools'

const iconStyle: Record<string, string> = {
  Data:      'bg-blue-100 text-blue-600',
  Security:  'bg-red-100 text-red-600',
  Generator: 'bg-emerald-100 text-emerald-600',
  Text:      'bg-amber-100 text-amber-700',
  Design:    'bg-pink-100 text-pink-600',
  Media:     'bg-purple-100 text-purple-600',
  Utils:     'bg-violet-100 text-violet-600',
}

const badgeStyle: Record<string, string> = {
  Data:      'bg-blue-50 text-blue-700 ring-blue-200',
  Security:  'bg-red-50 text-red-700 ring-red-200',
  Generator: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Text:      'bg-amber-50 text-amber-700 ring-amber-200',
  Design:    'bg-pink-50 text-pink-700 ring-pink-200',
  Media:     'bg-purple-50 text-purple-700 ring-purple-200',
  Utils:     'bg-violet-50 text-violet-700 ring-violet-200',
}

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      to={`/${tool.slug}`}
      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200 ${iconStyle[tool.category] ?? 'bg-slate-100 text-slate-500'}`}>
        {tool.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm leading-snug">
            {tool.name}
          </h3>
          <span className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0 text-base leading-none mt-0.5">
            →
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-2.5">{tool.description}</p>
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${badgeStyle[tool.category] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
          {tool.category}
        </span>
      </div>
    </Link>
  )
}
