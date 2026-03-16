import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function NavigationProgress() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const prevPathname = useRef(location.pathname)

  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      prevPathname.current = location.pathname
      setLoading(false)
    }
  }, [location.pathname])

  useEffect(() => {
    function handleClick(e) {
      const target = e.target.closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (href && href.startsWith('/') && href !== location.pathname) {
        setLoading(true)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [location.pathname])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-blue-100 overflow-hidden">
      <div
        className="h-full bg-blue-600"
        style={{ animation: 'navprogress 1.5s ease-in-out infinite', width: '40%' }}
      />
    </div>
  )
}
