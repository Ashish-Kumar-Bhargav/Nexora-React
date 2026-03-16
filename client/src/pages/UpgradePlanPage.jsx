import { useState, useEffect } from 'react'
import { Check, CreditCard, Zap, Star, Shield, Crown, X, Loader2, CheckCircle2 } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    color: 'gray',
    description: 'Perfect for freelancers & startups',
    icon: Zap,
    features: [
      'Dashboard',
      'Customers',
      'Invoices',
      'Products',
      'Up to 2 users',
      'Email support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 999,
    color: 'blue',
    description: 'For small businesses growing fast',
    icon: Star,
    popular: false,
    features: [
      'Everything in Free',
      'Quotations',
      'Inventory management',
      'Up to 5 users',
      'Priority email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2499,
    color: 'indigo',
    description: 'For businesses ready to scale',
    icon: Shield,
    popular: true,
    features: [
      'Everything in Starter',
      'Credit Notes',
      'Recurring Invoices',
      'Suppliers & Purchase Orders',
      'Reports',
      'Custom Fields',
      'Up to 20 users',
      'Phone & email support',
    ],
  },
  {
    id: 'max',
    name: 'Max',
    price: 4999,
    color: 'purple',
    description: 'Full power for enterprises',
    icon: Crown,
    features: [
      'Everything in Pro',
      'Activity Log',
      'User Management',
      'Email (SMTP) Settings',
      'Unlimited users',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
]

const colorMap = {
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',  btn: 'bg-gray-600 hover:bg-gray-700',   badge: 'bg-gray-100 text-gray-600',   ring: 'ring-gray-400',   icon: 'text-gray-500'   },
  blue:   { bg: 'bg-blue-50',    text: 'text-blue-600',   border: 'border-blue-200',  btn: 'bg-blue-600 hover:bg-blue-700',   badge: 'bg-blue-100 text-blue-700',   ring: 'ring-blue-400',   icon: 'text-blue-500'   },
  indigo: { bg: 'bg-indigo-50',  text: 'text-indigo-600', border: 'border-indigo-300',btn: 'bg-indigo-600 hover:bg-indigo-700',badge:'bg-indigo-100 text-indigo-700',ring: 'ring-indigo-400', icon: 'text-indigo-500' },
  purple: { bg: 'bg-purple-50',  text: 'text-purple-600', border: 'border-purple-200',btn: 'bg-purple-600 hover:bg-purple-700',badge:'bg-purple-100 text-purple-700',ring: 'ring-purple-400', icon: 'text-purple-500' },
}

function PaymentModal({ plan, onClose, onSuccess }) {
  const [step, setStep] = useState('form') // 'form' | 'processing' | 'success'
  const [form, setForm] = useState({ name: '', card: '', expiry: '', cvv: '' })
  const [errors, setErrors] = useState({})

  const c = colorMap[plan.color]

  function formatCard(val) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }
  function formatExpiry(val) {
    const digits = val.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
    return digits
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Cardholder name is required'
    if (form.card.replace(/\s/g, '').length < 16) e.card = 'Enter a valid 16-digit card number'
    if (!form.expiry.match(/^\d{2}\/\d{2}$/)) e.expiry = 'Enter expiry as MM/YY'
    if (form.cvv.length < 3) e.cvv = 'Enter a valid CVV'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setStep('processing')
    setTimeout(() => {
      setStep('success')
    }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-5 ${c.bg} border-b ${c.border} flex items-center justify-between`}>
          <div>
            <p className="text-sm text-gray-500">Upgrading to</p>
            <h2 className={`text-xl font-bold ${c.text}`}>{plan.name} Plan</h2>
            <p className="text-gray-600 text-sm mt-0.5">
              {plan.price === 0 ? 'Free forever' : `₹${plan.price.toLocaleString('en-IN')}/month`}
            </p>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This is a demo payment form. No real transaction will occur.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Smith"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${errors.name ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'}`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={form.card}
                    onChange={e => setForm(f => ({ ...f, card: formatCard(e.target.value) }))}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 pr-10 ${errors.card ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'}`}
                  />
                  <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {errors.card && <p className="text-red-500 text-xs mt-1">{errors.card}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={form.expiry}
                    onChange={e => setForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${errors.expiry ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'}`}
                  />
                  {errors.expiry && <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    maxLength={4}
                    value={form.cvv}
                    onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${errors.cvv ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'}`}
                  />
                  {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
                </div>
              </div>

              <button
                type="submit"
                className={`w-full ${c.btn} text-white font-semibold py-3 rounded-xl transition-colors mt-2`}
              >
                {plan.price === 0 ? 'Activate Free Plan' : `Pay ₹${plan.price.toLocaleString('en-IN')}`}
              </button>
            </form>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 size={48} className={`animate-spin ${c.text}`} />
              <p className="text-gray-700 font-medium">Processing your payment…</p>
              <p className="text-gray-400 text-sm">Please wait, do not close this window.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className={`w-16 h-16 rounded-full ${c.bg} flex items-center justify-center`}>
                <CheckCircle2 size={36} className={c.text} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Payment Successful!</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Your plan has been upgraded to <span className={`font-semibold ${c.text}`}>{plan.name}</span>.
                </p>
              </div>
              <button
                onClick={onSuccess}
                className={`${c.btn} text-white font-semibold px-8 py-2.5 rounded-xl transition-colors`}
              >
                Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UpgradePlanPage() {
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  useEffect(() => {
    fetchCurrentPlan()
  }, [])

  async function fetchCurrentPlan() {
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('/api/subscriptions/current', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        setCurrentPlan(json.data.subscription?.plan || 'free')
      } else {
        setError(json.message || 'Failed to load subscription')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId) {
    if (planId === currentPlan) return
    setSelectedPlan(PLANS.find(p => p.id === planId))
  }

  async function confirmUpgrade() {
    if (!selectedPlan) return
    setUpgrading(true)
    setUpgradeError('')
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: selectedPlan.id }),
      })
      const json = await res.json()
      if (json.success) {
        setCurrentPlan(selectedPlan.id)
        setSelectedPlan(null)
        window.location.href = '/dashboard'
      } else {
        setUpgradeError(json.message || 'Upgrade failed')
        setSelectedPlan(null)
      }
    } catch {
      setUpgradeError('Network error. Please try again.')
      setSelectedPlan(null)
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-7 w-7 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Plan</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Choose the plan that fits your business. Upgrade anytime to unlock more features.
        </p>
        {currentPlan && (
          <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Current plan: <span className="font-bold capitalize">{currentPlan}</span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">{error}</div>
      )}
      {upgradeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">{upgradeError}</div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const c = colorMap[plan.color]
          const Icon = plan.icon
          const isCurrent = plan.id === currentPlan
          const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlan)

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 flex flex-col transition-all duration-200 overflow-hidden
                ${isCurrent
                  ? `${c.border} shadow-lg ring-2 ${c.ring}/30`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }
                bg-white dark:bg-gray-800`}
            >
              {plan.popular && !isCurrent && (
                <div className="absolute top-0 right-0">
                  <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 right-0">
                  <div className={`${c.btn.split(' ')[0]} text-white text-xs font-bold px-3 py-1 rounded-bl-lg`}>
                    CURRENT
                  </div>
                </div>
              )}

              <div className={`p-5 ${isCurrent ? c.bg : ''}`}>
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                  <Icon size={20} className={c.icon} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 min-h-[2.5rem]">{plan.description}</p>
                <div className="mt-3">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">Free</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">₹</span>
                      <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm text-gray-400 dark:text-gray-500 mb-1">/mo</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5 flex-1 flex flex-col">
                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check size={14} className={`${c.text} flex-shrink-0 mt-0.5`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || upgrading}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
                    ${isCurrent
                      ? `${c.bg} ${c.text} border ${c.border} cursor-default`
                      : isDowngrade
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 cursor-pointer'
                      : `${c.btn} text-white`
                    }`}
                >
                  {isCurrent ? 'Current Plan' : isDowngrade ? 'Switch to this plan' : 'Upgrade'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
        All prices are in Indian Rupees (INR) and billed monthly. Taxes may apply.
      </p>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={confirmUpgrade}
        />
      )}
    </div>
  )
}
