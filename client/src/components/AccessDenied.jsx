import { useNavigate } from 'react-router-dom'
import { ShieldOff, ArrowLeft, Home } from 'lucide-react'

export default function AccessDenied() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center select-none">
      {/* Decorative glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl scale-150" />
        <div className="relative w-28 h-28 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-3xl flex items-center justify-center shadow-lg">
          <ShieldOff className="w-14 h-14 text-red-400" strokeWidth={1.5} />
        </div>
      </div>

      {/* Text */}
      <h1 className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">Access Denied</h1>
      <p className="text-gray-500 text-base max-w-sm leading-relaxed mb-8">
        You don't have permission to view this page. Please contact your administrator if you think this is a mistake.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* Subtle decoration */}
      <p className="mt-10 text-xs text-gray-300 font-mono tracking-widest uppercase">
        Error 403 · Forbidden
      </p>
    </div>
  )
}
