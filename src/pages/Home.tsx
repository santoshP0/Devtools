import { useState } from 'react'
import ToolCard from '../components/ToolCard'
import { tools, categories } from '../lib/tools'

export default function Home() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = tools.filter(tool => {
    const q = search.toLowerCase()
    const matchesSearch = !q || tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q)
    const matchesCategory = !activeCategory || tool.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex-1 flex flex-col">

      {/* Dark hero */}
      <div className="bg-slate-950 text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/15 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 ring-blue-500/25 mb-6 select-none">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            {tools.length} tools &middot; Free forever &middot; No sign-up
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Developer Toolbox
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-base mb-8">
            Fast, free browser tools for developers. No ads, no tracking, no data leaves your device.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none select-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search tools…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl bg-white/8 border border-white/12 text-white placeholder-slate-500 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/12 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category filter + grid */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all select-none ${
              !activeCategory
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            All
            <span className="ml-1.5 text-xs opacity-60">{tools.length}</span>
          </button>
          {categories.map(cat => {
            const count = tools.filter(t => t.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all select-none ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {cat}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-slate-700 font-semibold text-lg">No tools found for &ldquo;{search}&rdquo;</p>
            <p className="text-slate-400 text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(tool => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
