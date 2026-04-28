import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold tracking-tight shadow-md">
              DT
            </div>
            <span className="font-semibold text-[15px] tracking-tight">DevToolbox</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            No ads &middot; No tracking &middot; All in your browser
          </div>
        </div>
      </div>
    </nav>
  )
}
