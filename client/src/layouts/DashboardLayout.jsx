import { useEffect, useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import NavigationProgress from '../components/NavigationProgress.jsx'
import { PermissionsProvider } from '../context/PermissionsContext.jsx'

function readUserFromStorage() {
  try {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) return null
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const u = readUserFromStorage()
    setUser(u)
    setChecked(true)
    if (!u) navigate('/login', { replace: true })
  }, [navigate])

  if (!checked || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <PermissionsProvider>
      <NavigationProgress />
      <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
        <Sidebar userRole={user.role} userName={user.name} userEmail={user.email} userCompanyName={user.companyName} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={{ name: user.name, email: user.email, role: user.role, companyName: user.companyName }} />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </PermissionsProvider>
  )
}
