'use client'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export default function DiversityPage() {
  // Dados virão do endpoint de análise via SWR quando implementado
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Diversidade</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        PCoA e diversidade alpha — selecione um projeto para visualizar.
      </p>
      <Plot
        data={[{ type: 'scatter', mode: 'markers', x: [], y: [], name: 'PCoA' }]}
        layout={{ title: 'PCoA (Beta Diversidade)', xaxis: { title: 'PC1' }, yaxis: { title: 'PC2' }, width: 700, height: 500 }}
      />
    </main>
  )
}
