import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth.js'
import companiesRoutes from './routes/companies.js'
import customersRoutes from './routes/customers.js'
import productsRoutes from './routes/products.js'
import invoicesRoutes from './routes/invoices.js'
import quotationsRoutes from './routes/quotations.js'
import purchaseOrdersRoutes from './routes/purchaseOrders.js'
import creditNotesRoutes from './routes/creditNotes.js'
import recurringInvoicesRoutes from './routes/recurringInvoices.js'
import inventoryRoutes from './routes/inventory.js'
import suppliersRoutes from './routes/suppliers.js'
import usersRoutes from './routes/users.js'
import dashboardRoutes from './routes/dashboard.js'
import reportsRoutes from './routes/reports.js'
import searchRoutes from './routes/search.js'
import notificationsRoutes from './routes/notifications.js'
import emailsRoutes from './routes/emails.js'
import customFieldsRoutes from './routes/customFields.js'
import activityLogsRoutes from './routes/activityLogs.js'
import seedRoutes from './routes/seed.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/companies', companiesRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/invoices', invoicesRoutes)
app.use('/api/quotations', quotationsRoutes)
app.use('/api/purchase-orders', purchaseOrdersRoutes)
app.use('/api/credit-notes', creditNotesRoutes)
app.use('/api/recurring-invoices', recurringInvoicesRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/suppliers', suppliersRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/emails', emailsRoutes)
app.use('/api/custom-fields', customFieldsRoutes)
app.use('/api/activity-logs', activityLogsRoutes)
app.use('/api/seed', seedRoutes)

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Nexora API running' }))

app.listen(PORT, () => {
  console.log(`Nexora server running on http://localhost:${PORT}`)
})
