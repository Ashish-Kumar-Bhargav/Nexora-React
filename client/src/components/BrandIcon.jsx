// SmartBilling brand icon — a receipt/invoice with line items
export default function BrandIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Receipt body */}
      <path
        d="M4 1.5A.5.5 0 0 1 4.5 1h11a.5.5 0 0 1 .5.5V15l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4V1.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Invoice line items */}
      <path d="M7 5.5h6"   stroke="#1d4ed8" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 8h6"     stroke="#1d4ed8" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 10.5h3.5" stroke="#1d4ed8" strokeWidth="1.4" strokeLinecap="round" />
      {/* Total line */}
      <path d="M9.5 10.5h3.5" stroke="#1d4ed8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
