'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'
import { Footer } from '@/components/ui/Footer'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="shell">
      <Sidebar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
        <main className="main-content" style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}
