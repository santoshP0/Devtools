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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Developer Toolbox</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Free online tools for developers. No ads, no sign-up, no tracking.
          Everything runs directly in your browser.
        </p>
      </div>

      <div className="mb-5">
        <input
          type="search"
          placeholder="Search tools…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="block w-full max-w-md mx-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !activeCategory ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'
          }`}
        >
          All ({tools.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          No tools found for &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tool => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
