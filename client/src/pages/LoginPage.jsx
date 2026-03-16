import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Zap, Building2, ChevronRight, CheckCircle } from 'lucide-react'

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('credentials')
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [switchingCompany, setSwitchingCompany] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message || 'Login failed'); return }

      if (data.data.companies && data.data.companies.length > 1) {
        setCompanies(data.data.companies)
        setSelectedCompanyId(data.data.user.companyId || data.data.companies[0].companyId)
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        localStorage.setItem('companies', JSON.stringify(data.data.companies))
        setStep('company')
        return
      }

      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))
      localStorage.setItem('companies', JSON.stringify(data.data.companies || []))
      navigate('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCompanySelect() {
    if (!selectedCompanyId) return
    setSwitchingCompany(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, companyId: selectedCompanyId }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message || 'Failed'); return }
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))
      localStorage.setItem('companies', JSON.stringify(data.data.companies || []))
      navigate('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSwitchingCompany(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">NEXORA</h1>
          <p className="text-blue-300 mt-1 text-sm">Multi-Company ERP System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'credentials' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or Phone</label>
                  <input
                    type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or phone number" required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required
                      className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 mt-2">
                  {loading ? <><Spinner /> Signing in...</> : 'Sign In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </>
          )}

          {step === 'company' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Select Company</h2>
                  <p className="text-xs text-gray-500">You have access to multiple companies</p>
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
              <div className="space-y-2 mb-6">
                {companies.map((c) => (
                  <button
                    key={c.companyId}
                    onClick={() => setSelectedCompanyId(c.companyId)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      selectedCompanyId === c.companyId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        {c.role && <p className="text-xs text-gray-500 capitalize">{c.role.replace('_', ' ')}</p>}
                      </div>
                    </div>
                    {selectedCompanyId === c.companyId && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCompanySelect}
                disabled={!selectedCompanyId || switchingCompany}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {switchingCompany ? <><Spinner /> Loading...</> : <>Continue <ChevronRight className="w-4 h-4" /></>}
              </button>
              <button
                onClick={() => { setStep('credentials'); setError('') }}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors"
              >
                ← Back to login
              </button>
            </>
          )}
        </div>

        <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">New to Nexora?</p>
            <p className="text-blue-300 text-xs mt-0.5">Register your company and get started</p>
          </div>
          <Link to="/register"
            className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors whitespace-nowrap">
            <Building2 size={15} />
            Register Company
          </Link>
        </div>

        <p className="text-center text-blue-300 text-xs mt-5">
          &copy; {new Date().getFullYear()} Nexora ERP. All rights reserved.
        </p>
      </div>
    </div>
  )
}
