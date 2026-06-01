'use client'
import useSWR from 'swr'
import { api, type Project } from '@/lib/api'

export default function ProjectsPage() {
  const { data: projects, error, isLoading } = useSWR('projects', api.getProjects)

  if (isLoading) return <p>Carregando...</p>
  if (error) return <p>Erro ao carregar projetos.</p>

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Projetos</h1>
      <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
        {projects?.map((p: Project) => (
          <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>
            <strong>{p.code}</strong> — {p.name}
            <span style={{ marginLeft: '1rem', color: '#64748b' }}>{p.marker_type}</span>
            <span style={{ marginLeft: '1rem', color: p.status === 'active' ? '#16a34a' : '#dc2626' }}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
