'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { api, type WorkerStatus } from '@/lib/api'

const NAV_ITEMS = [
  { href: '/',              label: 'Dashboard',      icon: '⬡' },
  { href: '/projects',      label: 'Projetos',       icon: '⬡' },
  { href: '/jobs',          label: 'Fila de Jobs',   icon: '◈' },
  { href: '/diversity',     label: 'Beta Diversity',  icon: '◎' },
  { href: '/cross-project', label: 'Figura TCC ✦',   icon: '✦' },
]

function fmtSeconds(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

function timeAgo(s: number): string {
  if (s < 60)   return `${s}s atrás`
  if (s < 3600) return `${Math.floor(s / 60)}m atrás`
  return `${Math.floor(s / 3600)}h atrás`
}

function WorkerPanel() {
  const [apiOnline, setApiOnline] = useState(true)

  const { data, isLoading } = useSWR<WorkerStatus>(
    'worker-status',
    () => api.getWorkerStatus(),
    {
      refreshInterval: 5000,
      onSuccess: () => setApiOnline(true),
      onError:   () => setApiOnline(false),
    }
  )

  const running = data?.running      ?? []
  const queued  = data?.queued_count ?? 0
  const recent  = data?.recent       ?? []

  return (
    <div className="worker-panel">
      {/* Cabeçalho */}
      <div className="worker-panel-header">
        <span className="worker-panel-title">R WORKER</span>
        <div className="worker-online-badge">
          <span className={`dot ${apiOnline ? 'dot-green pulse' : 'dot-red'}`} />
          <span style={{ color: apiOnline ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>
            {isLoading ? '...' : apiOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Jobs em execução */}
      {running.map(job => (
        <div key={job.id} className="worker-job-running">
          <div className="worker-job-row">
            <span className="worker-job-type">{job.job_type}</span>
            <span className="worker-job-project">{job.project_code}</span>
          </div>
          <div className="worker-progress-bar-track">
            <div className="worker-progress-bar-fill" style={{ width: `${job.progress_pct}%` }} />
          </div>
          <div className="worker-job-meta">
            <span>{job.progress_pct}%</span>
            <span>≈ {fmtSeconds(job.remaining_s)} restantes</span>
          </div>
        </div>
      ))}

      {/* Idle */}
      {running.length === 0 && queued === 0 && !isLoading && (
        <div className="worker-idle">
          <span className="dot dot-gray" style={{ marginRight: 6 }} />
          <span>Aguardando jobs</span>
        </div>
      )}

      {/* Fila */}
      {queued > 0 && (
        <div className="worker-queue-row">
          <span style={{ color: 'var(--amber)' }}>◌</span>
          <span>{queued} job{queued > 1 ? 's' : ''} na fila</span>
        </div>
      )}

      {/* Recentes */}
      {recent.length > 0 && <div className="worker-divider" />}
      {recent.slice(0, 4).map(job => (
        <div key={job.id} className="worker-recent-row">
          <span style={{ color: job.status === 'done' ? 'var(--green)' : 'var(--red)', fontSize: 10 }}>
            {job.status === 'done' ? '✓' : '✗'}
          </span>
          <span className="worker-recent-type">{job.job_type}</span>
          <span className="worker-recent-project">{job.project_code}</span>
          <span className="worker-recent-time">{timeAgo(job.seconds_ago)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🧬</span>
          <div>
            <div className="sidebar-logo-text glow-cyan">Bio-Platform</div>
          </div>
        </div>
        <div className="sidebar-subtitle">TCC · BIOINFORMÁTICA</div>
      </div>

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

      <div className="sidebar-footer">
        <WorkerPanel />
      </div>
    </aside>
  )
}
