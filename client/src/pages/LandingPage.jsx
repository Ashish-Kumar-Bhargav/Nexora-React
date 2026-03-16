import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  BarChart3, FileText, Package, Users, Receipt, ShoppingCart,
  Truck, CheckCircle, ArrowRight, X, Building2, CreditCard, Activity,
  Settings, Mail, RefreshCw, Shield, Menu, Star, Layers,
} from 'lucide-react'
import BrandIcon from '../components/BrandIcon.jsx'

const FEATURES = [
  {
    icon: Receipt,
    title: 'Smart Invoicing',
    desc: 'Create professional GST-ready invoices in seconds. Auto-numbering, PDF export, and email delivery built in.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Package,
    title: 'Inventory Control',
    desc: 'Track stock levels in real-time. Low-stock alerts, product variants, and warehouse management.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: FileText,
    title: 'Quotation Builder',
    desc: 'Convert quotations to invoices with one click. Track approval status and send to clients seamlessly.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: BarChart3,
    title: 'Business Reports',
    desc: 'Visualise revenue trends, sales analytics, and inventory reports. Make data-driven decisions.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Building2,
    title: 'Multi-Company',
    desc: 'Manage multiple companies from a single login with completely isolated data for each entity.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    desc: 'Assign granular permissions to admins, managers, and users. Control exactly what each person can do.',
    color: 'bg-cyan-50 text-cyan-600',
  },
]

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for freelancers & startups',
    borderColor: 'border-gray-200',
    badgeClass: '',
    badge: null,
    ctaLabel: 'Get Started Free',
    ctaClass: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50',
    features: [
      { text: 'Dashboard & Analytics', ok: true },
      { text: 'Customer Management', ok: true },
      { text: 'Invoice Generation', ok: true },
      { text: 'Product Catalog', ok: true },
      { text: 'Quotations', ok: false },
      { text: 'Inventory Tracking', ok: false },
      { text: 'Purchase Orders', ok: false },
      { text: 'Reports & Analytics', ok: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 999,
    description: 'For small businesses growing fast',
    borderColor: 'border-blue-300',
    badge: null,
    ctaLabel: 'Get Starter',
    ctaClass: 'bg-blue-600 text-white hover:bg-blue-700',
    features: [
      { text: 'Everything in Free', ok: true },
      { text: 'Quotation Management', ok: true },
      { text: 'Full Product Management', ok: true },
      { text: 'Inventory Tracking', ok: true },
      { text: 'Purchase Orders', ok: false },
      { text: 'Suppliers Management', ok: false },
      { text: 'Credit Notes', ok: false },
      { text: 'Reports & Analytics', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2499,
    description: 'For businesses ready to scale',
    borderColor: 'border-indigo-500',
    badge: 'Most Popular',
    badgeClass: 'bg-indigo-600 text-white',
    ctaLabel: 'Get Pro',
    ctaClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
    features: [
      { text: 'Everything in Starter', ok: true },
      { text: 'Suppliers Management', ok: true },
      { text: 'Purchase Orders', ok: true },
      { text: 'Credit Notes & Recurring', ok: true },
      { text: 'Reports & Analytics', ok: true },
      { text: 'Custom Fields', ok: true },
      { text: 'Activity Logs', ok: false },
      { text: 'SMTP Email Config', ok: false },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    price: 4999,
    description: 'Full power for enterprises',
    borderColor: 'border-purple-400',
    badge: 'All Features',
    badgeClass: 'bg-purple-600 text-white',
    ctaLabel: 'Get Max',
    ctaClass: 'bg-purple-600 text-white hover:bg-purple-700',
    features: [
      { text: 'Everything in Pro', ok: true },
      { text: 'Activity Logs', ok: true },
      { text: 'SMTP Email Configuration', ok: true },
      { text: 'User & Role Management', ok: true },
      { text: 'Advanced Permissions', ok: true },
      { text: 'Priority Support', ok: true },
      { text: 'Unlimited Data', ok: true },
      { text: 'All Future Modules', ok: true },
    ],
  },
]

const MODULES = [
  'Invoices', 'Quotations', 'Credit Notes', 'Recurring Invoices',
  'Customers', 'Suppliers', 'Purchase Orders', 'Products',
  'Inventory', 'Reports', 'Activity Log', 'Custom Fields',
  'Email Settings', 'User Management', 'Multi-Company',
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // If already logged in, skip the landing page
  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token && user) navigate('/dashboard', { replace: true })
  }, [navigate])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navigation ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-200">
              <BrandIcon size={16} />
            </div>
            <span className="font-extrabold text-lg tracking-tight">
              <span className={`transition ${scrolled ? 'text-gray-900' : 'text-white'}`}>Smart</span>
              <span className="text-blue-500">Billing</span>
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {[['#features', 'Features'], ['#modules', 'Modules'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} className={`text-sm font-medium transition ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>{label}</a>
            ))}
            <Link to="/login" className={`text-sm font-medium transition ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>Sign In</Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm shadow-blue-200">
              Get Started Free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-1.5" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen
              ? <X size={22} className={scrolled ? 'text-gray-700' : 'text-white'} />
              : <Menu size={22} className={scrolled ? 'text-gray-700' : 'text-white'} />
            }
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
            {[['#features', 'Features'], ['#modules', 'Modules'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600">{label}</a>
            ))}
            <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600">Sign In</Link>
            <Link to="/register" className="block mt-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl text-center">
              Get Started Free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-32">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
            <BrandIcon size={12} /> All-in-One Business ERP Platform for India
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Manage Your Business<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              with Confidence
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300/90 max-w-2xl mx-auto mb-10 leading-relaxed">
            SmartBilling brings invoicing, inventory, procurement, and reporting into one powerful platform.
            GST-ready, multi-company, built for Indian businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-xl shadow-blue-500/25 text-base"
            >
              Start Free — No Card Required <ArrowRight size={17} />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 font-medium px-8 py-4 rounded-xl transition text-base"
            >
              See How It Works
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
            {['Free plan forever', 'No setup fees', 'GST-ready invoicing', 'Multi-company support'].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-emerald-400" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: '10,000+', label: 'Invoices Generated' },
            { value: '500+',    label: 'Businesses Onboarded' },
            { value: '15+',     label: 'Integrated Modules' },
            { value: '99.9%',   label: 'Uptime Guaranteed' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-1">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 block">Why SmartBilling</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything to Run Your Business</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              From your first invoice to enterprise-scale operations — SmartBilling scales with you.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-5`}>
                  <f.icon size={22} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ── */}
      <section id="modules" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3 block">Modules</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">15+ Integrated Modules</h2>
          <p className="text-gray-500 mb-12 max-w-lg mx-auto">Every module works together seamlessly. No integrations required.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {MODULES.map((m) => (
              <span key={m} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-full hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                <Layers size={13} className="text-blue-500" /> {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 block">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Start for free. Upgrade as you grow. All prices in Indian Rupees (₹), billed monthly.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 ${plan.borderColor} p-7 flex flex-col shadow-sm ${plan.badge === 'Most Popular' ? 'shadow-xl ring-2 ring-indigo-200 scale-[1.03]' : ''}`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.badgeClass}`}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
                </div>

                <div className="mb-6">
                  {plan.price === 0 ? (
                    <div className="text-4xl font-extrabold text-gray-900">Free</div>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-gray-400 pb-1">/mo</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-sm">
                      {f.ok
                        ? <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        : <X size={15} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      }
                      <span className={f.ok ? 'text-gray-700' : 'text-gray-400'}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition text-center block ${plan.ctaClass}`}
                >
                  {plan.ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            All plans start with the Free tier after registration. Upgrade anytime from your dashboard. No hidden fees.
          </p>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BrandIcon size={28} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Transform Your Business?</h2>
          <p className="text-blue-100 mb-8 text-lg max-w-xl mx-auto">
            Join hundreds of Indian businesses already using SmartBilling to streamline operations and accelerate growth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl transition text-base shadow-lg"
            >
              Get Started Free <ArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 border-2 border-white/40 text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition text-base"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BrandIcon size={14} />
                </div>
                <span className="font-extrabold text-lg tracking-tight">
                  <span className="text-white">Smart</span><span className="text-blue-400">Billing</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">All-in-one ERP platform for modern Indian businesses.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#modules" className="hover:text-white transition">Modules</a>
              <a href="#pricing" className="hover:text-white transition">Pricing</a>
              <Link to="/login" className="hover:text-white transition">Sign In</Link>
              <Link to="/register" className="hover:text-white transition">Register</Link>
            </div>

            <p className="text-xs text-slate-500 text-center md:text-right">
              © {new Date().getFullYear()} SmartBilling.<br />All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}