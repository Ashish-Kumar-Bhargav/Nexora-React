import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ThemeProvider from './components/ThemeProvider.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'

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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/credit-notes" element={<CreditNotesPage />} />
            <Route path="/recurring-invoices" element={<RecurringInvoicesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/activity-log" element={<ActivityLogPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings/custom-fields" element={<CustomFieldsPage />} />
            <Route path="/settings/smtp" element={<SmtpPage />} />
          </Route>

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}
