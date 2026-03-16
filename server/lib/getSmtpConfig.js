import { connectMasterDB } from './mongodb.js'
import Company from '../models/master/Company.js'

export async function getCompanySmtpConfig(companyId) {
  if (!companyId) return null
  await connectMasterDB()
  const company = await Company.findById(companyId)
    .select('smtpHost smtpPort smtpUser smtpPass smtpFrom smtpFromName')
    .lean()

  if (!company || !company.smtpHost || !company.smtpUser || !company.smtpPass) return null

  return {
    host: company.smtpHost,
    port: company.smtpPort || 587,
    user: company.smtpUser,
    pass: company.smtpPass,
    from: company.smtpFrom,
    fromName: company.smtpFromName,
  }
}
