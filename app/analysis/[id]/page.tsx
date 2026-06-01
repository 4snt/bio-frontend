'use client'

import useSWR from 'swr'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const DARK_LAYOUT: Partial<Plotly.Layout> = {
  paper_bgcolor: '#0a1628',
  plot_bgcolor:  '#050d1a',
  font: { color: '#e2eeff', family: 'Inter, system-ui, sans-serif', size: 12 },
  xaxis: {
    gridcolor: 'rgba(0,212,255,0.08)',
    zerolinecolor: 'rgba(0,212,255,0.20)',
    title: { text: 'log₂ Fold Change', standoff: 8 },
    tickfont: { color: '#7a9cc0' },
  },
  yaxis: {
    gridcolor: 'rgba(0,212,255,0.08)',
    zerolinecolor: 'rgba(0,212,255,0.08)',
    title: { text: '-log₁₀(padj)', standoff: 8 },
    tickfont: { color: '#7a9cc0' },
  },
  title: {
    text: 'Volcano Plot — DESeq2',
    font: { color: '#00d4ff', size: 16 },
    x: 0.02,
    xanchor: 'left',
  },
  margin: { t: 56, b: 56, l: 60, r: 24 },
  legend: {
    bgcolor: 'rgba(10,22,40,0.8)',
    bordercolor: 'rgba(0,212,255,0.15)',
    borderwidth: 1,
    font: { color: '#7a9cc0', size: 11 },
  },
  hoverlabel: {
    bgcolor: '#0f1e38',
    bordercolor: '#00d4ff',
    font: { color: '#e2eeff' },
  },
}

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { data, error, isLoading } = useSWR(
    ['analysis', params.id],
    () => api.getAnalysisResults(params.id)
  )

  const deseq2 = data?.find((r) => r.analysis_type === 'deseq2')
  const degs = (deseq2?.result_data as { degs?: Array<{ gene_id: string; log2_fold_change: number; p_adjusted: number }> })?.degs ?? []

  // Split into significant vs non-significant for different marker colors
  const sig = degs.filter((d) => Math.abs(d.log2_fold_change) > 1 && d.p_adjusted < 0.05)
  const ns  = degs.filter((d) => !(Math.abs(d.log2_fold_change) > 1 && d.p_adjusted < 0.05))

  const makeTrace = (
    items: typeof degs,
    name: string,
    color: string,
    size: number,
    opacity: number
  ) => ({
    type: 'scatter' as const,
    mode: 'markers' as const,
    name,
    x: items.map((d) => d.log2_fold_change),
    y: items.map((d) => -Math.log10(d.p_adjusted)),
    text: items.map((d) => d.gene_id),
    hovertemplate: '<b>%{text}</b><br>log2FC: %{x:.3f}<br>-log10(padj): %{y:.3f}<extra></extra>',
    marker: {
      color,
      size,
      opacity,
      line: { color: 'rgba(0,0,0,0.3)', width: 0.5 },
    },
  })

  const shortId = params.id.slice(0, 8)

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/">Dashboard</Link>
        <span className="breadcrumb-sep">/</span>
        <span>Análises</span>
        <span className="breadcrumb-sep">/</span>
        <span className="mono">{shortId}…</span>
      </div>

      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Análise</h1>
        <p className="page-subtitle mono">{params.id}</p>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="plot-card">
          <div className="skeleton" style={{ width: '100%', height: 500, borderRadius: 8 }} />
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: 24, color: 'var(--red)' }}>
          ⚠ Erro ao carregar resultados da análise.
        </div>
      )}

      {!isLoading && !error && (
        <div className="plot-card">
          {degs.length === 0 ? (
            <div className="empty-state" style={{ height: 400 }}>
              <span className="empty-state-icon">◌</span>
              <span className="empty-state-title">Sem dados DESeq2</span>
              <span className="empty-state-desc">
                O job ainda não possui resultados de expressão diferencial.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="badge badge-cyan">{sig.length} DEGs significativos</span>
                <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  {ns.length} não significativos
                </span>
              </div>
              <Plot
                data={[
                  makeTrace(ns,  'Não significativo', '#3a5578', 5, 0.6),
                  makeTrace(sig, 'Significativo',     '#00d4ff', 7, 0.9),
                ]}
                layout={{
                  ...DARK_LAYOUT,
                  width: undefined,
                  height: 500,
                  autosize: true,
                } as Partial<Plotly.Layout>}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </>
          )}
        </div>
      )}
    </>
  )
}
