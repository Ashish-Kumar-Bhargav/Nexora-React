export const MODULES = [
  'invoices', 'quotations', 'purchase-orders', 'credit-notes',
  'recurring-invoices', 'customers', 'suppliers', 'products',
  'inventory', 'users', 'reports', 'activity-logs',
]

// All controllable page keys (excludes always-allowed 'profile' and super_admin-only 'companies')
export const ALL_PAGE_KEYS = [
  'dashboard', 'customers', 'quotations', 'invoices', 'credit-notes',
  'recurring-invoices', 'suppliers', 'purchase-orders', 'products',
  'inventory', 'reports', 'activity-log', 'users', 'custom-fields', 'smtp-settings',
]

// Pages always accessible regardless of permissions
export const ALWAYS_ALLOWED_PAGES = ['dashboard', 'profile']

export const ROLE_HIERARCHY = {
  user: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
}

export const DEFAULT_PERMISSIONS = {
  invoices: { view: true, create: true, update: false, delete: false },
  quotations: { view: true, create: true, update: false, delete: false },
  'purchase-orders': { view: true, create: false, update: false, delete: false },
  'credit-notes': { view: true, create: false, update: false, delete: false },
  'recurring-invoices': { view: true, create: false, update: false, delete: false },
  customers: { view: true, create: true, update: true, delete: false },
  suppliers: { view: true, create: false, update: false, delete: false },
  products: { view: true, create: true, update: false, delete: false },
  inventory: { view: true, create: true, update: false, delete: false },
  users: { view: false, create: false, update: false, delete: false },
  reports: { view: false },
  'activity-logs': { view: false },
}

export function hasPermission(role, module, action) {
  if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['admin']) return true
  const perms = DEFAULT_PERMISSIONS[module]
  if (!perms) return false
  return perms[action] === true
}

export function canApprove(role) {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['admin']
}
