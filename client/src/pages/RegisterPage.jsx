import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Building2, User, ChevronRight, ChevronLeft, CheckCircle, Upload, X } from 'lucide-react'
import BrandIcon from '../components/BrandIcon.jsx'

const initial = {
  companyName: '', companyCode: '', companyEmail: '', companyPhone: '', companyAddress: '', gstNumber: '',
  logo: '', signature: '',
  adminName: '', adminEmail: '', adminPhone: '', adminPassword: '', confirmPassword: '',
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initial)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const logoRef = useRef(null)
  const sigRef = useRef(null)

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2MB'); return }
    const b64 = await fileToBase64(file)
    setForm((f) => ({ ...f, logo: b64 }))
  }

  async function handleSigUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) { setError('Signature must be under 1MB'); return }
    const b64 = await fileToBase64(file)
    setForm((f) => ({ ...f, signature: b64 }))
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleCompanyNameChange = (e) => {
    const name = e.target.value
    setForm((f) => ({
      ...f,
      companyName: name,
      companyCode: f.companyCode || name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 6),
    }))
  }

  const validateStep1 = () => {
    if (!form.companyName.trim()) return 'Company name is required'
    if (!form.companyCode.trim()) return 'Company code is required'
    if (form.companyCode.length < 2) return 'Company code must be at least 2 characters'
    return ''
  }

  const validateStep2 = () => {
    if (!form.adminName.trim()) return 'Admin name is required'
    if (!form.adminEmail.trim()) return 'Admin email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) return 'Enter a valid email address'
    if (!form.adminPassword) return 'Password is required'
    if (form.adminPassword.length < 6) return 'Password must be at least 6 characters'
    if (form.adminPassword !== form.confirmPassword) return 'Passwords do not match'
    return ''
  }

  const goNext = () => {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError(''); setStep(2)
  }

  const goBack = () => { setError(''); setStep(1) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validateStep2()
    if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName, companyCode: form.companyCode,
          companyEmail: form.companyEmail, companyPhone: form.companyPhone,
          companyAddress: form.companyAddress, gstNumber: form.gstNumber,
          logo: form.logo || undefined, signature: form.signature || undefined,
          adminName: form.adminName, adminEmail: form.adminEmail,
          adminPhone: form.adminPhone, adminPassword: form.adminPassword,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message || 'Registration failed'); return }
      setStep(3)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <BrandIcon size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-white">Smart</span><span className="text-blue-400">Billing</span>
          </h1>
          <p className="text-blue-300 mt-1 text-sm">Multi-Company ERP System</p>
        </div>

        {step === 3 ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Company Registered!</h2>
            <p className="text-gray-500 text-sm mb-2">
              <span className="font-semibold text-gray-700">{form.companyName}</span> has been successfully registered.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              You can now log in with <span className="font-semibold text-blue-600">{form.adminEmail}</span>
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <Building2 size={14} />
                </div>
                <span className={`text-sm font-medium ${step === 1 ? 'text-gray-800' : 'text-gray-400'}`}>Company Info</span>
              </div>
              <div className="w-8 h-px bg-gray-300" />
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <User size={14} />
                </div>
                <span className={`text-sm font-medium ${step === 2 ? 'text-gray-800' : 'text-gray-400'}`}>Admin Account</span>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-5">Company Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.companyName} onChange={handleCompanyNameChange} placeholder="e.g. Acme Solutions Pvt Ltd"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Code <span className="text-red-500">*</span></label>
                    <input type="text" value={form.companyCode} onChange={set('companyCode')} placeholder="e.g. ACME" maxLength={10}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase" />
                    <p className="text-xs text-gray-400 mt-1">Short unique code (max 10 chars)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">GST Number</label>
                    <input type="text" value={form.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Email</label>
                    <input type="email" value={form.companyEmail} onChange={set('companyEmail')} placeholder="info@company.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Phone</label>
                    <input type="text" value={form.companyPhone} onChange={set('companyPhone')} placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                    <input type="text" value={form.companyAddress} onChange={set('companyAddress')} placeholder="123 Business Park, City - 000000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Logo</label>
                    <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    {form.logo ? (
                      <div className="flex items-center gap-2">
                        <img src={form.logo} alt="Logo" className="h-12 w-auto rounded border border-gray-200 object-contain bg-gray-50 px-2" />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, logo: '' }))} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => logoRef.current?.click()}
                        className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition w-full">
                        <Upload size={14} /> Upload Logo (PNG/JPG, max 2MB)
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Authorized Signature</label>
                    <input ref={sigRef} type="file" accept="image/*" onChange={handleSigUpload} className="hidden" />
                    {form.signature ? (
                      <div className="flex items-center gap-2">
                        <img src={form.signature} alt="Signature" className="h-12 w-auto rounded border border-gray-200 object-contain bg-gray-50 px-2" />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, signature: '' }))} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => sigRef.current?.click()}
                        className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition w-full">
                        <Upload size={14} /> Upload Signature (PNG, max 1MB)
                      </button>
                    )}
                  </div>
                </div>
                <button type="button" onClick={goNext}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 mt-2">
                  Next: Admin Account <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-5">Admin Account Setup</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.adminName} onChange={set('adminName')} placeholder="e.g. John Smith"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="admin@company.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <input type="text" value={form.adminPhone} onChange={set('adminPhone')} placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={form.adminPassword} onChange={set('adminPassword')} placeholder="Min 6 characters"
                        className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password"
                        className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={goBack}
                    className="flex items-center gap-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                    {loading ? (
                      <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>Registering...</>
                    ) : 'Register Company'}
                  </button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        )}

        <p className="text-center text-blue-300 text-xs mt-6">
          &copy; {new Date().getFullYear()} SmartBilling. All rights reserved.
        </p>
      </div>
    </div>
  )
}
