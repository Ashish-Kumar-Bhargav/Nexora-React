import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ThemeProvider from './components/ThemeProvider.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import AccessDenied from './components/AccessDenied.jsx'
import { usePermissions } from './context/PermissionsContext.jsx'

import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'

import DashboardPage from './pages/DashboardPage.jsx'
import CustomersPage from './pages/CustomersPage.jsx'
import InvoicesPage from './pages/InvoicesPage.jsx'
import QuotationsPage from './pages/QuotationsPage.jsx'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx'
import CreditNotesPage from './pages/CreditNotesPage.jsx'
import RecurringInvoicesPage from './pages/RecurringInvoicesPage.jsx'
import SuppliersPage from './pages/SuppliersPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import CompaniesPage from './pages/CompaniesPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ActivityLogPage from './pages/ActivityLogPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import CustomFieldsPage from './pages/CustomFieldsPage.jsx'
import SmtpPage from './pages/SmtpPage.jsx'

// Wraps a page and shows AccessDenied if the user lacks permission for that pageKey
function PermissionGate({ pageKey, children }) {
  const { canAccess, isLoaded } = usePermissions()
  if (!isLoaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-7 w-7 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )
  if (!canAccess(pageKey)) return <AccessDenied />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected dashboard routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<PermissionGate pageKey="dashboard"><DashboardPage /></PermissionGate>} />
            <Route path="/customers" element={<PermissionGate pageKey="customers"><CustomersPage /></PermissionGate>} />
            <Route path="/invoices" element={<PermissionGate pageKey="invoices"><InvoicesPage /></PermissionGate>} />
            <Route path="/quotations" element={<PermissionGate pageKey="quotations"><QuotationsPage /></PermissionGate>} />
            <Route path="/purchase-orders" element={<PermissionGate pageKey="purchase-orders"><PurchaseOrdersPage /></PermissionGate>} />
            <Route path="/credit-notes" element={<PermissionGate pageKey="credit-notes"><CreditNotesPage /></PermissionGate>} />
            <Route path="/recurring-invoices" element={<PermissionGate pageKey="recurring-invoices"><RecurringInvoicesPage /></PermissionGate>} />
            <Route path="/suppliers" element={<PermissionGate pageKey="suppliers"><SuppliersPage /></PermissionGate>} />
            <Route path="/products" element={<PermissionGate pageKey="products"><ProductsPage /></PermissionGate>} />
            <Route path="/inventory" element={<PermissionGate pageKey="inventory"><InventoryPage /></PermissionGate>} />
            <Route path="/users" element={<PermissionGate pageKey="users"><UsersPage /></PermissionGate>} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/reports" element={<PermissionGate pageKey="reports"><ReportsPage /></PermissionGate>} />
            <Route path="/activity-log" element={<PermissionGate pageKey="activity-log"><ActivityLogPage /></PermissionGate>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings/custom-fields" element={<PermissionGate pageKey="custom-fields"><CustomFieldsPage /></PermissionGate>} />
            <Route path="/settings/smtp" element={<PermissionGate pageKey="smtp-settings"><SmtpPage /></PermissionGate>} />
          </Route>

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}
