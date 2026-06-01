'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { data, error, isLoading } = useSWR(
    ['analysis', params.id],
    () => api.getAnalysisResults(params.id)
  )

  if (isLoading) return <p>Carregando resultados...</p>
  if (error) return <p>Erro ao carregar análise.</p>

  const deseq2 = data?.find(r => r.analysis_type === 'deseq2')
  const degs = (deseq2?.result_data as any)?.degs ?? []

  const x = degs.map((d: any) => d.log2_fold_change)
  const y = degs.map((d: any) => -Math.log10(d.p_adjusted))
  const text = degs.map((d: any) => d.gene_id)

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Análise {params.id}</h1>
      <Plot
        data={[{ type: 'scatter', mode: 'markers', x, y, text, hovertemplate: '%{text}<br>log2FC: %{x}<br>-log10(padj): %{y}' }]}
        layout={{ title: 'Volcano Plot', xaxis: { title: 'log2 Fold Change' }, yaxis: { title: '-log10(padj)' }, width: 800, height: 500 }}
      />
    </main>
  )
}
