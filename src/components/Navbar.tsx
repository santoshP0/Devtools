import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-slate-900 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xs tracking-tight">
              DT
            </div>
            <span className="font-semibold text-base">DevToolbox</span>
          </Link>
          <span className="text-xs text-slate-400 hidden sm:block">
            No ads &middot; No tracking &middot; All in your browser
          </span>
        </div>
      </div>
    </nav>
  )
}
