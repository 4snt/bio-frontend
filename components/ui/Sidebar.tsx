'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',             label: 'Dashboard',    icon: '⬡' },
  { href: '/projects',     label: 'Projetos',     icon: '⬡' },
  { href: '/jobs',         label: 'Fila de Jobs', icon: '◈' },
  { href: '/diversity',    label: 'Beta Diversity', icon: '◎' },
  { href: '/cross-project', label: 'Figura TCC ✦', icon: '✦' },
]

function WorkerStatus() {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) })
        if (!cancelled) setStatus(res.ok ? 'online' : 'offline')
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }

    check()
    const interval = setInterval(check, 15_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="worker-status-card">
      <div className="worker-status-label">R Worker</div>
      <div className="worker-status-row">
        {status === 'loading' && (
          <>
            <span className="dot dot-gray pulse" />
            <span style={{ color: 'var(--text-3)' }}>Verificando...</span>
          </>
        )}
        {status === 'online' && (
          <>
            <span className="dot dot-green" />
            <span style={{ color: 'var(--green)' }}>Online</span>
          </>
        )}
        {status === 'offline' && (
          <>
            <span className="dot dot-red" />
            <span style={{ color: 'var(--red)' }}>Offline</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🧬</span>
          <div>
            <div className="sidebar-logo-text glow-cyan">Bio-Platform</div>
          </div>
        </div>
        <div className="sidebar-subtitle">TCC · Bioinformática</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href) ? ' active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <WorkerStatus />
      </div>
    </aside>
  )
}
