'use client'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const PROJECTS = ['INOVAHERB', 'Pós-Fogo', 'Biorremediação']

export default function CrossProjectPage() {
  const emptyTrace = { type: 'scatter' as const, mode: 'markers' as const, x: [], y: [] }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Figura TCC — 6 PCoAs</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Painel gerado após evento CrossProjectFigureReady.
      </p>
      <Plot
        data={PROJECTS.flatMap((p, i) => [
          { ...emptyTrace, name: `${p} — Bray-Curtis`, xaxis: `x${i * 2 + 1}`, yaxis: `y${i * 2 + 1}` },
          { ...emptyTrace, name: `${p} — UniFrac`, xaxis: `x${i * 2 + 2}`, yaxis: `y${i * 2 + 2}` },
        ])}
        layout={{
          title: '6 PCoAs — Comparação Entre Projetos',
          grid: { rows: 3, columns: 2, pattern: 'independent' },
          width: 900,
          height: 1100,
        }}
      />
    </main>
  )
}
