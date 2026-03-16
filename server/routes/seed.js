import { Router } from 'express'
import { connectMasterDB } from '../lib/mongodb.js'
import User from '../models/master/User.js'
import Company from '../models/master/Company.js'
import Product from '../models/master/Product.js'
import { hashPassword } from '../lib/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ success: false, message: 'Seed not allowed in production' })

  try {
    await connectMasterDB()

    await User.deleteMany({})
    await Company.deleteMany({})
    await Product.deleteMany({})

    const techCorp = await Company.create({
      name: 'TechCorp Solutions Pvt Ltd', code: 'TECH', dbName: 'nexora_techcorp',
      address: '42, Tech Park, Whitefield, Bangalore - 560066', phone: '080-41234567',
      email: 'info@techcorp.com', gstNumber: '29AABCT1332L1ZV', isActive: true,
    })

    const retailHub = await Company.create({
      name: 'RetailHub India Pvt Ltd', code: 'RETAIL', dbName: 'nexora_retailhub',
      address: '15, MG Road, Pune - 411001', phone: '020-27654321',
      email: 'info@retailhub.com', gstNumber: '27AABCR4567M1ZQ', isActive: true,
    })

    const adminPass   = await hashPassword('Admin@123')
    const managerPass = await hashPassword('Manager@123')
    const userPass    = await hashPassword('User@123')
    const superPass   = await hashPassword('Super@123')

    await User.create({ name: 'Super Administrator', email: 'superadmin@nexora.com', phone: '9000000001', password: superPass, role: 'super_admin', companies: [], isActive: true })

    const techAdmin = await User.create({ name: 'Arjun Mehta', email: 'admin@techcorp.com', phone: '9000000002', password: adminPass, role: 'admin', companies: [{ companyId: techCorp._id, role: 'admin', permissions: {}, isActive: true }], isActive: true })
    await User.create({ name: 'Priya Sharma', email: 'manager@techcorp.com', phone: '9000000003', password: managerPass, role: 'manager', companies: [{ companyId: techCorp._id, role: 'manager', permissions: {}, isActive: true }], isActive: true })
    await User.create({ name: 'Rahul Verma', email: 'user@techcorp.com', phone: '9000000004', password: userPass, role: 'user', companies: [{ companyId: techCorp._id, role: 'user', permissions: {}, isActive: true }], isActive: true })

    const retailAdmin = await User.create({ name: 'Sneha Patel', email: 'admin@retailhub.com', phone: '9000000005', password: adminPass, role: 'admin', companies: [{ companyId: retailHub._id, role: 'admin', permissions: {}, isActive: true }], isActive: true })
    await User.create({ name: 'Vikram Nair', email: 'manager@retailhub.com', phone: '9000000006', password: managerPass, role: 'manager', companies: [{ companyId: retailHub._id, role: 'manager', permissions: {}, isActive: true }], isActive: true })
    await User.create({ name: 'Kiran Das', email: 'kiran@nexora.com', phone: '9000000007', password: adminPass, role: 'admin', companies: [{ companyId: techCorp._id, role: 'admin', permissions: {}, isActive: true }, { companyId: retailHub._id, role: 'manager', permissions: {}, isActive: true }], isActive: true })

    const productsData = [
      { name: 'Laptop Pro 15"', category: 'Electronics', description: 'High performance laptop with Intel i7 processor', unit: 'pcs', basePrice: 75000, taxRate: 18, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: 'Wireless Mouse', category: 'Electronics', description: 'Ergonomic wireless mouse with USB receiver', unit: 'pcs', basePrice: 850, taxRate: 18, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: 'Mechanical Keyboard', category: 'Electronics', description: 'RGB backlit mechanical keyboard, Cherry MX switches', unit: 'pcs', basePrice: 4500, taxRate: 18, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: 'USB-C Hub 7-in-1', category: 'Electronics', description: 'Multiport adapter with HDMI, USB 3.0, SD card reader', unit: 'pcs', basePrice: 2200, taxRate: 18, status: 'pending', requiresApproval: true, createdBy: techAdmin._id },
      { name: '27" 4K Monitor', category: 'Electronics', description: 'Ultra HD IPS display, 144Hz refresh rate', unit: 'pcs', basePrice: 32000, taxRate: 18, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: 'Ergonomic Office Chair', category: 'Furniture', description: 'Lumbar support, adjustable armrests, mesh back', unit: 'pcs', basePrice: 12000, taxRate: 12, status: 'approved', requiresApproval: false, createdBy: retailAdmin._id, approvedBy: retailAdmin._id },
      { name: 'Standing Desk 160cm', category: 'Furniture', description: 'Electric height adjustable desk with memory presets', unit: 'pcs', basePrice: 28000, taxRate: 12, status: 'approved', requiresApproval: false, createdBy: retailAdmin._id, approvedBy: retailAdmin._id },
      { name: 'Bookshelf 5-tier', category: 'Furniture', description: 'Solid wood bookshelf, walnut finish', unit: 'pcs', basePrice: 8500, taxRate: 12, status: 'draft', requiresApproval: false, createdBy: retailAdmin._id },
      { name: 'A4 Copier Paper (500 sheets)', category: 'Stationery', description: '80 GSM white copier paper, one ream', unit: 'ream', basePrice: 350, taxRate: 5, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: 'Blue Ballpoint Pens (12 pack)', category: 'Stationery', description: 'Smooth writing ballpoint pens, box of 12', unit: 'box', basePrice: 120, taxRate: 5, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: 'Stapler Heavy Duty', category: 'Stationery', description: '50-sheet capacity stapler with 1000 staples', unit: 'pcs', basePrice: 480, taxRate: 5, status: 'approved', requiresApproval: false, createdBy: retailAdmin._id, approvedBy: retailAdmin._id },
      { name: 'Antivirus License (1 Year)', category: 'Software', description: 'Enterprise endpoint protection, single user', unit: 'license', basePrice: 1800, taxRate: 18, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: 'Cloud Backup 1TB', category: 'Software', description: 'Annual cloud backup subscription, 1TB storage', unit: 'license', basePrice: 3600, taxRate: 18, status: 'pending', requiresApproval: true, createdBy: techAdmin._id },
      { name: 'Wi-Fi Router AC1200', category: 'Networking', description: 'Dual-band router, 1200Mbps, 4 LAN ports', unit: 'pcs', basePrice: 2800, taxRate: 18, status: 'approved', requiresApproval: false, createdBy: techAdmin._id, approvedBy: techAdmin._id },
      { name: '24-Port Network Switch', category: 'Networking', description: 'Managed gigabit switch for enterprise networks', unit: 'pcs', basePrice: 14500, taxRate: 18, status: 'draft', requiresApproval: true, createdBy: techAdmin._id },
    ]

    for (const p of productsData) await Product.create(p)

    return res.json({
      success: true, message: 'Database seeded successfully!',
      data: {
        companies: [{ name: 'TechCorp Solutions Pvt Ltd', code: 'TECH' }, { name: 'RetailHub India Pvt Ltd', code: 'RETAIL' }],
        credentials: [
          { role: 'Super Admin',        email: 'superadmin@nexora.com',  password: 'Super@123',   company: 'Any / Master' },
          { role: 'TechCorp Admin',     email: 'admin@techcorp.com',     password: 'Admin@123',   company: 'TechCorp Solutions' },
          { role: 'TechCorp Manager',   email: 'manager@techcorp.com',   password: 'Manager@123', company: 'TechCorp Solutions' },
          { role: 'TechCorp User',      email: 'user@techcorp.com',      password: 'User@123',    company: 'TechCorp Solutions' },
          { role: 'RetailHub Admin',    email: 'admin@retailhub.com',    password: 'Admin@123',   company: 'RetailHub India' },
          { role: 'RetailHub Manager',  email: 'manager@retailhub.com',  password: 'Manager@123', company: 'RetailHub India' },
          { role: 'Multi-Company User', email: 'kiran@nexora.com',       password: 'Admin@123',   company: 'TechCorp (Admin) + RetailHub (Manager)' },
        ],
        products: `${productsData.length} products created`,
      },
    })
  } catch (err) {
    console.error('Seed error:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
})

export default router
