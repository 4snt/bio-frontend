'use client'
import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { api } from '@/lib/api'

export default function NetworkPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useSWR(
    ['analysis', params.id],
    () => api.getAnalysisResults(params.id)
  )
  const cyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!data || !cyRef.current) return
    const spieceasi = data.find(r => r.analysis_type === 'spieceasi')
    const network = (spieceasi?.result_data as any) ?? { nodes: [], edges: [] }

    import('cytoscape').then(({ default: cytoscape }) => {
      cytoscape({
        container: cyRef.current,
        elements: [
          ...network.nodes.map((n: any) => ({ data: { id: n.id, label: n.id } })),
          ...network.edges.map((e: any) => ({ data: { source: e.source, target: e.target } })),
        ],
        style: [
          { selector: 'node', style: { label: 'data(label)', 'font-size': 10 } },
          { selector: 'edge', style: { width: 1, 'line-color': '#94a3b8' } },
        ],
        layout: { name: 'cose' },
      })
    })
  }, [data])

  if (isLoading) return <p>Carregando rede...</p>

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Rede Microbiana — Job {params.id}</h1>
      <div ref={cyRef} style={{ width: '100%', height: 600, border: '1px solid #e2e8f0', borderRadius: 8 }} />
    </main>
  )
}
