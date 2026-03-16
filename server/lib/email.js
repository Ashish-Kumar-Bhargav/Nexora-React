import nodemailer from 'nodemailer'

export function createTransporter(smtp) {
  const config = smtp || {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port || 587,
    secure: (config.port || 587) === 465,
    auth: { user: config.user || config.auth?.user, pass: config.pass || config.auth?.pass },
  })
}

export function buildFromAddress(smtp) {
  const name = smtp?.fromName || process.env.SMTP_FROM_NAME || 'Nexora ERP'
  const email = smtp?.from || smtp?.user || process.env.SMTP_FROM || process.env.SMTP_USER || ''
  return `"${name}" <${email}>`
}

export async function sendEmailWithAttachment({ to, cc, bcc, subject, html, attachments, smtpConfig }) {
  const transporter = createTransporter(smtpConfig)
  const from = buildFromAddress(smtpConfig)

  await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    cc: cc && cc.length ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
    bcc: bcc && bcc.length ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
    subject,
    html,
    attachments,
  })
}

export function buildEmailTemplate({ title, documentNumber, customerName, companyName, message, details }) {
  const detailRows = (details || []).map(d => `
    <tr>
      <td style="padding:8px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">${d.label}</td>
      <td style="padding:8px 16px;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${d.value}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#2563eb;padding:28px 40px;">
            <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:2px;">NEXORA</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;">${title}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">Dear ${customerName},</p>
            ${message ? `<p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">${message}</p>` : ''}
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;overflow:hidden;margin:24px 0;">
              ${detailRows}
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Sent by ${companyName} via Nexora ERP</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
