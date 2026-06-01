'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { api, type Job } from '@/lib/api'
import { connectJobStatusSocket } from '@/lib/websocket'

const STATUS_COLORS: Record<string, string> = {
  queued: '#f59e0b',
  running: '#3b82f6',
  done: '#16a34a',
  failed: '#dc2626',
}

export default function JobsPage() {
  const [statuses, setStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    const disconnect = connectJobStatusSocket((jobId, status) => {
      setStatuses(prev => ({ ...prev, [jobId]: status }))
    })
    return disconnect
  }, [])

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Fila de Análises</h1>
      <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
        Status em tempo real via WebSocket.
      </p>
      {Object.entries(statuses).length === 0 && (
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Aguardando jobs...</p>
      )}
      {Object.entries(statuses).map(([jobId, status]) => (
        <div key={jobId} style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <code style={{ fontSize: 12, color: '#64748b' }}>{jobId.slice(0, 8)}…</code>
          <span style={{ color: STATUS_COLORS[status] ?? '#1e293b', fontWeight: 600 }}>{status}</span>
        </div>
      ))}
    </main>
  )
}
