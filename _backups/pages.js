// Canonical page definitions for the permission system

export const PAGE_GROUPS = [
  {
    label: 'Main',
    pages: [
      { key: 'dashboard', label: 'Dashboard', alwaysAllowed: true },
    ],
  },
  {
    label: 'Sales',
    pages: [
      { key: 'customers', label: 'Customers' },
      { key: 'quotations', label: 'Quotations' },
      { key: 'invoices', label: 'Invoices' },
      { key: 'credit-notes', label: 'Credit Notes' },
      { key: 'recurring-invoices', label: 'Recurring Invoices' },
    ],
  },
  {
    label: 'Procurement',
    pages: [
      { key: 'suppliers', label: 'Suppliers' },
      { key: 'purchase-orders', label: 'Purchase Orders' },
    ],
  },
  {
    label: 'Inventory',
    pages: [
      { key: 'products', label: 'Products' },
      { key: 'inventory', label: 'Inventory' },
    ],
  },
  {
    label: 'Reports & Logs',
    pages: [
      { key: 'reports', label: 'Reports' },
      { key: 'activity-log', label: 'Activity Log' },
    ],
  },
  {
    label: 'Administration',
    pages: [
      { key: 'users', label: 'Users' },
      { key: 'custom-fields', label: 'Custom Fields' },
      { key: 'smtp-settings', label: 'Email Settings' },
    ],
  },
]

// All controllable page keys
export const ALL_PAGE_KEYS = PAGE_GROUPS.flatMap((g) => g.pages.map((p) => p.key))

// Pages always accessible regardless of any permissions
export const ALWAYS_ALLOWED_PAGES = ['dashboard', 'profile']

// Map from route path to page key (null = not permission-controlled)
export const PATH_TO_KEY = {
  '/dashboard': 'dashboard',
  '/customers': 'customers',
  '/quotations': 'quotations',
  '/invoices': 'invoices',
  '/credit-notes': 'credit-notes',
  '/recurring-invoices': 'recurring-invoices',
  '/suppliers': 'suppliers',
  '/purchase-orders': 'purchase-orders',
  '/products': 'products',
  '/inventory': 'inventory',
  '/reports': 'reports',
  '/activity-log': 'activity-log',
  '/users': 'users',
  '/companies': null,
  '/settings/custom-fields': 'custom-fields',
  '/settings/smtp': 'smtp-settings',
  '/profile': 'profile',
}
