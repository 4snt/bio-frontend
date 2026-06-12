'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { api, type Project, type Job, type Sample, type ProjectArtifacts, type SraMetadata, type SraRunsResult, type FastqSourceInfo } from '@/lib/api'

const ANALYSIS_TYPES = [
  'deseq2', 'ancombc2', 'maaslin2', 'spieceasi',
  'random_forest', 'gsea', 'funguild', 'picrust2',
]

function markerBadge(marker: string) {
  if (marker === 'ITS') return <span className="badge badge-purple">ITS</span>
  return <span className="badge badge-blue">16S</span>
}

function statusDot(status: string) {
  if (status === 'active')    return <span className="dot dot-green" />
  if (status === 'running')   return <span className="dot dot-cyan pulse" />
  if (status === 'completed') return <span className="dot dot-green" />
  return <span className="dot dot-gray" />
}

function jobStatusBadge(status: string) {
  if (status === 'queued')  return <span className="badge badge-amber">queued</span>
  if (status === 'running') return <span className="badge badge-cyan">running</span>
  if (status === 'done')    return <span className="badge badge-green">done</span>
  if (status === 'failed')  return <span className="badge badge-red">failed</span>
  return <span className="badge">{status}</span>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const { data: project, error: projectError } = useSWR(
    id ? ['project', id] : null,
    () => api.getProject(id),
  )

  const { data: samples, error: samplesError } = useSWR(
    id ? ['samples', id] : null,
    () => api.getSamples(id),
    { refreshInterval: 10000 },
  )

  const { data: jobs, error: jobsError } = useSWR(
    id ? ['jobs', id] : null,
    () => api.getJobs(id),
    { refreshInterval: 5000 },
  )

  const { data: artifacts } = useSWR<ProjectArtifacts>(
    id ? ['artifacts', id] : null,
    () => api.getArtifacts(id),
    { refreshInterval: 30000 }
  )

  const { data: sraRuns } = useSWR<SraRunsResult>(
    id && project?.bioproject_accession ? ['sra-runs', id] : null,
    () => api.getSraRuns(id),
    { revalidateOnFocus: false }
  )

  // Upload FASTQ
  const [showUpload, setShowUpload] = useState(false)
  const [r1File, setR1File] = useState<File | null>(null)
  const [r2File, setR2File] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const r1Ref = useRef<HTMLInputElement>(null)
  const r2Ref = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!r1File || !r2File || !id) return
    setUploading(true)
    setUploadProgress(10)
    setUploadStatus('enviando para o banco de dados...')
    try {
      setUploadProgress(40)
      await api.uploadFastqPair(r1File, r2File, id)
      setUploadProgress(100)
      setUploadStatus('concluido')
      mutate(['samples', id])
      setTimeout(() => {
        setR1File(null)
        setR2File(null)
        setUploadProgress(0)
        setUploadStatus('')
        setShowUpload(false)
        if (r1Ref.current) r1Ref.current.value = ''
        if (r2Ref.current) r2Ref.current.value = ''
      }, 1500)
    } catch {
      setUploadStatus('Erro durante o upload. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  // Upload artefato .rds
  const [showArtifactUpload, setShowArtifactUpload] = useState(false)
  const [artifactFile, setArtifactFile] = useState<File | null>(null)
  const [artifactUploading, setArtifactUploading] = useState(false)
  const [artifactStatus, setArtifactStatus] = useState('')
  const artifactRef = useRef<HTMLInputElement>(null)

  async function handleArtifactUpload() {
    if (!artifactFile || !id) return
    setArtifactUploading(true)
    setArtifactStatus('armazenando no banco de dados...')
    try {
      await api.uploadArtifact(artifactFile, id)
      setArtifactStatus('concluido')
      mutate(['artifacts', id])
      setTimeout(() => {
        setArtifactFile(null)
        setArtifactStatus('')
        setShowArtifactUpload(false)
        if (artifactRef.current) artifactRef.current.value = ''
      }, 1500)
    } catch {
      setArtifactStatus('Erro no upload. Tente novamente.')
    } finally {
      setArtifactUploading(false)
    }
  }

  // SRA Import
  const [showSraImport, setShowSraImport]     = useState(false)
  const [sraAccession, setSraAccession]       = useState('')
  const [sraSource, setSraSource]             = useState('sra')
  const [sraMeta, setSraMeta]                 = useState<SraMetadata | null>(null)
  const [sraTreatment, setSraTreatment]       = useState('')
  const [sraReplicate, setSraReplicate]       = useState(1)
  const [sraVerifying, setSraVerifying]       = useState(false)
  const [sraImporting, setSraImporting]       = useState(false)
  const [sraStatus, setSraStatus]             = useState('')

  const { data: fastqSources } = useSWR<{ sources: FastqSourceInfo[] }>(
    'fastq-sources',
    () => api.getFastqSources(),
    { revalidateOnFocus: false }
  )

  async function handleSraVerify() {
    const acc = sraAccession.trim().toUpperCase()
    if (!acc) return
    setSraVerifying(true)
    setSraMeta(null)
    setSraStatus('')
    try {
      const meta = await api.sraPreview(acc, sraSource)
      setSraMeta(meta)
      if (meta.sample_name) setSraTreatment(meta.sample_name)
    } catch (e: unknown) {
      setSraStatus(e instanceof Error ? e.message : 'Accession não encontrado.')
    } finally {
      setSraVerifying(false)
    }
  }

  async function handleSraImport() {
    if (!sraMeta || !id) return
    setSraImporting(true)
    const sourceLabel = fastqSources?.sources.find(s => s.key === sraSource)?.label ?? sraSource
    setSraStatus(`baixando FASTQs via ${sourceLabel}...`)
    try {
      await api.importSra({
        accession:       sraMeta.accession,
        project_id:      id,
        treatment_group: sraTreatment,
        replicate:       sraReplicate,
        source:          sraSource,
      })
      setSraStatus('concluido')
      mutate(['samples', id])
      setTimeout(() => {
        setSraMeta(null)
        setSraAccession('')
        setSraStatus('')
        setSraTreatment('')
        setSraReplicate(1)
        setShowSraImport(false)
      }, 1500)
    } catch (e: unknown) {
      setSraStatus(e instanceof Error ? e.message : 'Erro ao importar. Tente novamente.')
    } finally {
      setSraImporting(false)
    }
  }

  // Gerar phyloseq via DADA2
  const [generatingPhyloseq, setGeneratingPhyloseq] = useState(false)
  const [phyloseqStatus, setPhyloseqStatus] = useState('')
  const samplesWithFastq = samples?.filter((s: Sample) => s.fastq_r1_oid && s.fastq_r2_oid) ?? []

  async function handleGeneratePhyloseq() {
    if (!id || generatingPhyloseq) return
    setGeneratingPhyloseq(true)
    setPhyloseqStatus('enfileirando...')
    try {
      await api.enqueueJob(id, 'dada2_pipeline')
      setPhyloseqStatus('job enfileirado — acompanhe o progresso em Analises')
      mutate(['jobs', id])
    } catch (e: unknown) {
      setPhyloseqStatus(e instanceof Error ? e.message : 'Erro ao enfileirar DADA2.')
    } finally {
      setGeneratingPhyloseq(false)
    }
  }

  // Enqueue
  const [showEnqueue, setShowEnqueue] = useState(false)
  const [selectedJobType, setSelectedJobType] = useState(ANALYSIS_TYPES[0])
  const [selectedOid, setSelectedOid] = useState<number | null>(null)
  const [enqueueing, setEnqueueing] = useState(false)

  function openEnqueue() {
    if (!selectedOid && artifacts?.available.length) {
      setSelectedOid(artifacts.available[0].phyloseq_oid)
    }
    setShowEnqueue(v => !v)
  }

  async function handleEnqueue() {
    if (!id) return
    setEnqueueing(true)
    try {
      await api.enqueueJob(id, selectedJobType, selectedOid ?? undefined)
      mutate(['jobs', id])
      setShowEnqueue(false)
    } catch {
      alert('Erro ao enfileirar job. Verifique o console.')
    } finally {
      setEnqueueing(false)
    }
  }

  if (projectError) {
    return (
      <div className="card" style={{ padding: 20, color: 'var(--red)' }}>
        Erro ao carregar projeto.
      </div>
    )
  }

  const canUpload = !!r1File && !!r2File && !uploading

  return (
    <>
      <div className="breadcrumb">
        <Link href="/projects">Projetos</Link>
        <span className="breadcrumb-sep">/</span>
        <span>{project?.code ?? '...'}</span>
      </div>

      <div className="page-header">
        {project ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title mono" style={{ color: 'var(--cyan)' }}>{project.code}</h1>
            {markerBadge(project.marker_type)}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
              {statusDot(project.status)} {project.status}
            </span>
          </div>
        ) : (
          <div className="skeleton" style={{ height: 28, width: 240 }} />
        )}
        {project && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p className="page-subtitle" style={{ margin: 0 }}>{project.name}</p>
            {project.author && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>·</span>
                {project.author.avatar_url ? (
                  <img
                    src={project.author.avatar_url}
                    alt={project.author.name}
                    referrerPolicy="no-referrer"
                    style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                  }}>
                    {project.author.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{project.author.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acesso rápido ao módulo metagenômico */}
      {project && (
        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/projects/${id}/metagenomics`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px',
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.25)',
              borderRadius: 8, color: 'var(--cyan)',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              transition: 'all 0.15s',
            }}
          >
            🧬 Módulo de Metagenômica
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>
              ASV · Diversidade · PCoA · Biomarcadores →
            </span>
          </Link>
        </div>
      )}

      {/* Amostras */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <span className="section-title" style={{ flex: 1 }}>Amostras</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowSraImport(v => !v); setShowUpload(false) }}
              style={{
                padding: '6px 14px',
                background: showSraImport ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 8, color: 'var(--amber)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showSraImport ? '✕ Fechar' : '⬇ Import SRA'}
            </button>
            <button
              onClick={() => { setShowUpload(v => !v); setShowSraImport(false) }}
              style={{
                padding: '6px 14px',
                background: 'var(--cyan-dim)', border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: 8, color: 'var(--cyan)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showUpload ? '✕ Fechar' : '↑ Upload FASTQ'}
            </button>
          </div>
        </div>

        {/* SRA Import Panel */}
        {showSraImport && (
          <div className="card" style={{ padding: 20, marginBottom: 16, borderColor: 'rgba(245,158,11,0.2)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4, fontSize: 14 }}>
              Importar FASTQ de repositório externo
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Insira um accession. O download é feito via o repositório selecionado.
              </span>
              {/* Source selector — visível apenas quando há mais de uma opção */}
              {fastqSources && fastqSources.sources.length > 1 && (
                <select
                  value={sraSource}
                  onChange={e => { setSraSource(e.target.value); setSraMeta(null); setSraStatus('') }}
                  style={{
                    background: 'var(--surface-2)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 6, color: 'var(--amber)', fontSize: 12,
                    fontFamily: 'var(--mono)', padding: '4px 8px', cursor: 'pointer',
                  }}
                >
                  {fastqSources.sources.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              )}
              {fastqSources && fastqSources.sources.length === 1 && (
                <span style={{
                  fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 8px',
                  borderRadius: 4, background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)', color: 'var(--amber)',
                }}>
                  {fastqSources.sources[0].label}
                </span>
              )}
            </div>

            {/* Step 1: verificar accession */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={sraAccession}
                onChange={e => { setSraAccession(e.target.value.toUpperCase()); setSraMeta(null); setSraStatus('') }}
                placeholder={sraSource === 'geo' ? 'GSM1234567' : 'SRR9847653'}
                style={{
                  flex: 1, minWidth: 180, background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 7, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)',
                  padding: '7px 12px', outline: 'none',
                }}
              />
              <button
                onClick={handleSraVerify}
                disabled={!sraAccession.trim() || sraVerifying}
                style={{
                  padding: '7px 16px',
                  background: sraAccession.trim() && !sraVerifying ? 'rgba(245,158,11,0.15)' : 'var(--surface-2)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 7, color: 'var(--amber)', fontSize: 13, fontWeight: 600,
                  cursor: sraAccession.trim() && !sraVerifying ? 'pointer' : 'not-allowed',
                }}
              >
                {sraVerifying ? 'Verificando...' : 'Verificar'}
              </button>
            </div>

            {/* SRA metadata preview */}
            {sraMeta && (
              <div style={{
                background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px',
                marginBottom: 14, fontSize: 12,
              }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span><span style={{ color: 'var(--text-3)' }}>Accession:</span>{' '}
                    <span className="mono" style={{ color: 'var(--amber)' }}>{sraMeta.accession}</span></span>
                  <span><span style={{ color: 'var(--text-3)' }}>Estratégia:</span>{' '}
                    <span className="mono">{sraMeta.library_strategy}</span></span>
                  <span><span style={{ color: 'var(--text-3)' }}>Layout:</span>{' '}
                    <span className="mono" style={{ color: 'var(--green)' }}>{sraMeta.library_layout}</span></span>
                  {sraMeta.spots && (
                    <span><span style={{ color: 'var(--text-3)' }}>Reads:</span>{' '}
                      <span className="mono">{Number(sraMeta.spots).toLocaleString('pt-BR')}</span></span>
                  )}
                  <span><span style={{ color: 'var(--text-3)' }}>Organismo:</span>{' '}
                    <span className="mono">{sraMeta.organism}</span></span>
                  {sraMeta.bioproject && (
                    <span><span style={{ color: 'var(--text-3)' }}>BioProject:</span>{' '}
                      <span className="mono">{sraMeta.bioproject}</span></span>
                  )}
                  {sraMeta.biosample && sraMeta.biosample.startsWith('GSM') && (
                    <span><span style={{ color: 'var(--text-3)' }}>GSM:</span>{' '}
                      <span className="mono" style={{ color: 'var(--amber)' }}>{sraMeta.biosample}</span></span>
                  )}
                </div>

                {/* Step 2: metadados da amostra */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                      Grupo (treatment_group)
                    </label>
                    <input
                      type="text"
                      value={sraTreatment}
                      onChange={e => setSraTreatment(e.target.value)}
                      placeholder="T1B2"
                      style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 6, color: 'var(--text)', fontSize: 12,
                        fontFamily: 'var(--mono)', padding: '6px 10px', outline: 'none', width: 120,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                      Réplica
                    </label>
                    <input
                      type="number"
                      value={sraReplicate}
                      onChange={e => setSraReplicate(Number(e.target.value))}
                      min={1}
                      style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 6, color: 'var(--text)', fontSize: 12,
                        fontFamily: 'var(--mono)', padding: '6px 10px', outline: 'none', width: 70,
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSraImport}
                    disabled={sraImporting || !sraTreatment.trim()}
                    style={{
                      padding: '7px 16px',
                      background: !sraImporting && sraTreatment.trim() ? 'var(--amber)' : 'var(--surface-2)',
                      border: 'none', borderRadius: 7,
                      color: !sraImporting && sraTreatment.trim() ? '#050d1a' : 'var(--text-3)',
                      fontSize: 13, fontWeight: 700,
                      cursor: !sraImporting && sraTreatment.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {sraImporting ? 'Importando...' : 'Importar FASTQs'}
                  </button>
                </div>
              </div>
            )}

            {sraStatus === 'concluido' && (
              <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ FASTQs importados com sucesso.</div>
            )}
            {sraStatus && sraStatus !== 'concluido' && sraStatus !== 'baixando FASTQs do ENA...' && (
              <div style={{ fontSize: 12, color: 'var(--red)' }}>{sraStatus}</div>
            )}
            {sraImporting && sraStatus === 'baixando FASTQs do ENA...' && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{sraStatus}</div>
            )}

            {/* Lista de runs do BioProject (se disponível) */}
            {sraRuns && sraRuns.runs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Runs disponíveis em {sraRuns.bioproject}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {sraRuns.runs.map(run => (
                    <div
                      key={run.accession}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 10px', background: 'var(--bg)',
                        border: '1px solid var(--border)', borderRadius: 6, gap: 12,
                      }}
                    >
                      <span className="mono" style={{ fontSize: 12, color: 'var(--amber)' }}>{run.accession}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1 }}>{run.sample_name}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{run.library_strategy}</span>
                      <button
                        onClick={() => { setSraAccession(run.accession); setSraMeta(null); setSraStatus('') }}
                        style={{
                          padding: '3px 10px', background: 'rgba(245,158,11,0.1)',
                          border: '1px solid rgba(245,158,11,0.25)', borderRadius: 5,
                          color: 'var(--amber)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Usar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showUpload && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 14, fontSize: 14 }}>
              Upload de Par FASTQ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  Arquivo R1:
                </label>
                <input ref={r1Ref} type="file" accept=".fastq,.fastq.gz"
                  onChange={e => setR1File(e.target.files?.[0] ?? null)}
                  style={{ color: 'var(--text)', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  Arquivo R2:
                </label>
                <input ref={r2Ref} type="file" accept=".fastq,.fastq.gz"
                  onChange={e => setR2File(e.target.files?.[0] ?? null)}
                  style={{ color: 'var(--text)', fontSize: 13 }} />
              </div>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, var(--cyan), rgba(0,212,255,0.5))',
                    borderRadius: 99, transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                  {uploadProgress}% — {uploadStatus}
                </div>
              </div>
            )}

            {uploadStatus === 'concluido' && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 12 }}>
                Upload concluído com sucesso.
              </div>
            )}
            {uploadStatus.startsWith('Erro') && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{uploadStatus}</div>
            )}

            <button onClick={handleUpload} disabled={!canUpload} style={{
              padding: '8px 18px',
              background: canUpload ? 'var(--cyan)' : 'var(--surface-2)',
              color: canUpload ? '#050d1a' : 'var(--text-3)',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: canUpload ? 'pointer' : 'not-allowed',
            }}>
              {uploading ? 'Enviando...' : 'Confirmar Upload'}
            </button>
          </div>
        )}

        {!samples && !samplesError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
          </div>
        )}

        {samples && samples.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <span className="empty-state-icon">◌</span>
            <span className="empty-state-title">Nenhuma amostra.</span>
            <span className="empty-state-desc">Faca upload do primeiro par FASTQ.</span>
          </div>
        )}

        {samples && samples.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Filename</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Grupo</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Replica</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>R1 OID</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>R2 OID</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s: Sample) => (
                  <tr key={s.id} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="mono" style={{ color: 'var(--text)' }}>{s.filename}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{s.treatment_group}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{s.replicate}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.fastq_r1_oid ?? '—'}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.fastq_r2_oid ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Artefatos */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span className="section-title">Artefatos</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 10 }}>
              arquivos .rds usados como entrada nas análises
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {samplesWithFastq.length > 0 && (
              <button
                onClick={handleGeneratePhyloseq}
                disabled={generatingPhyloseq}
                title={`Gerar phyloseq .rds automaticamente a partir dos ${samplesWithFastq.length} pares FASTQ (DADA2 + SILVA/UNITE)`}
                style={{
                  padding: '6px 14px',
                  background: generatingPhyloseq ? 'var(--surface-2)' : 'rgba(16,212,138,0.1)',
                  border: `1px solid ${generatingPhyloseq ? 'var(--border)' : 'rgba(16,212,138,0.3)'}`,
                  borderRadius: 8, color: generatingPhyloseq ? 'var(--text-3)' : 'var(--green)',
                  fontSize: 13, fontWeight: 600,
                  cursor: generatingPhyloseq ? 'not-allowed' : 'pointer',
                }}
              >
                {generatingPhyloseq ? 'Enfileirando...' : `⚗ Gerar phyloseq (DADA2)`}
              </button>
            )}
            <button
              onClick={() => setShowArtifactUpload(v => !v)}
              style={{
                padding: '6px 14px', background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.25)', borderRadius: 8,
                color: 'var(--purple)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showArtifactUpload ? '✕ Fechar' : '↑ Upload .rds'}
            </button>
          </div>
        </div>
        {phyloseqStatus && (
          <div style={{
            marginBottom: 12, padding: '8px 12px',
            background: phyloseqStatus.includes('Erro') ? 'rgba(239,68,68,0.07)' : 'rgba(16,212,138,0.07)',
            border: `1px solid ${phyloseqStatus.includes('Erro') ? 'rgba(239,68,68,0.2)' : 'rgba(16,212,138,0.2)'}`,
            borderRadius: 8, fontSize: 12,
            color: phyloseqStatus.includes('Erro') ? 'var(--red)' : 'var(--green)',
          }}>
            {phyloseqStatus}
          </div>
        )}

        {showArtifactUpload && (
          <div className="card" style={{ padding: 20, marginBottom: 16, borderColor: 'rgba(168,85,247,0.2)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 14, fontSize: 14 }}>
              Upload de Artefato phyloseq
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
              Selecione um arquivo <span className="mono">.rds</span> gerado pelo script{' '}
              <span className="mono">tsv_to_phyloseq.R</span> ou exportado pelo R.
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  Arquivo .rds
                </label>
                <input ref={artifactRef} type="file" accept=".rds,.RDS"
                  onChange={e => setArtifactFile(e.target.files?.[0] ?? null)}
                  style={{ color: 'var(--text)', fontSize: 13 }} />
              </div>
              <button onClick={handleArtifactUpload} disabled={!artifactFile || artifactUploading} style={{
                padding: '7px 18px',
                background: artifactFile && !artifactUploading ? 'var(--purple)' : 'var(--surface-2)',
                color: artifactFile && !artifactUploading ? '#fff' : 'var(--text-3)',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: artifactFile && !artifactUploading ? 'pointer' : 'not-allowed',
              }}>
                {artifactUploading ? 'Enviando...' : 'Confirmar Upload'}
              </button>
            </div>
            {artifactStatus === 'concluido' && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--green)' }}>
                ✓ Upload concluído — artefato disponível para análise.
              </div>
            )}
            {artifactStatus.startsWith('Erro') && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--red)' }}>{artifactStatus}</div>
            )}
            {artifactUploading && !artifactStatus.startsWith('Erro') && artifactStatus !== 'concluido' && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                {artifactStatus}
              </div>
            )}
          </div>
        )}

        {artifacts && artifacts.available.length === 0 && (
          <div style={{
            padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 13, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>◌</span>
            <div>
              <div style={{ color: 'var(--text-2)', fontWeight: 600, marginBottom: 2 }}>Nenhum artefato cadastrado</div>
              <div style={{ fontSize: 12 }}>
                Faça upload de um <span className="mono">.rds</span> ou use o script{' '}
                <span className="mono">scripts/data-prep/tsv_to_phyloseq.R</span> para converter as tabelas do laboratório.
              </div>
            </div>
          </div>
        )}

        {artifacts && artifacts.available.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {artifacts.available.map(art => {
              const isSelected = selectedOid === art.phyloseq_oid
              return (
                <div key={art.job_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--surface)',
                  border: `1px solid ${isSelected ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`,
                  borderRadius: 8, gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>📦</span>
                    <div>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>
                        OID: {art.phyloseq_oid}
                      </span>
                      {art.created_at && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 10 }}>
                          {new Date(art.created_at).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedOid(art.phyloseq_oid); setShowEnqueue(true) }}
                    style={{
                      padding: '4px 12px',
                      background: isSelected ? 'rgba(168,85,247,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${isSelected ? 'rgba(168,85,247,0.35)' : 'var(--border)'}`,
                      borderRadius: 6, color: isSelected ? 'var(--purple)' : 'var(--text-2)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {isSelected ? '✓ Selecionado' : 'Usar nesta análise'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Analises */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="section-title" style={{ flex: 1 }}>Analises</span>
          <button onClick={openEnqueue} style={{
            marginLeft: 16, padding: '6px 14px',
            background: 'rgba(16,212,138,0.1)', border: '1px solid rgba(16,212,138,0.25)',
            borderRadius: 8, color: 'var(--green)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {showEnqueue ? '✕ Fechar' : '▶ Enfileirar Analise'}
          </button>
        </div>

        {showEnqueue && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 14, fontSize: 14 }}>
              Nova Analise
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  Tipo de analise
                </label>
                <select value={selectedJobType} onChange={e => setSelectedJobType(e.target.value)} style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', padding: '6px 10px',
                  fontSize: 13, fontFamily: 'var(--mono)',
                }}>
                  {ANALYSIS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  <span>Artefato phyloseq</span>
                  {artifacts && (
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--mono)', padding: '1px 6px', borderRadius: 4,
                      background: artifacts.available.length > 0 ? 'rgba(16,212,138,0.12)' : 'rgba(245,158,11,0.12)',
                      color: artifacts.available.length > 0 ? 'var(--green)' : 'var(--amber)',
                      border: `1px solid ${artifacts.available.length > 0 ? 'rgba(16,212,138,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    }}>
                      {artifacts.available.length > 0
                        ? `${artifacts.available.length} artefato(s) disponível`
                        : 'nenhum artefato — execute QIIME2 primeiro'}
                    </span>
                  )}
                </label>
                {artifacts && artifacts.available.length > 0 ? (
                  <select value={selectedOid ?? ''} onChange={e => setSelectedOid(e.target.value ? Number(e.target.value) : null)} style={{
                    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)', padding: '6px 10px',
                    fontSize: 12, fontFamily: 'var(--mono)',
                  }}>
                    <option value="">— selecionar artefato —</option>
                    {artifacts.available.map(a => (
                      <option key={a.job_id} value={a.phyloseq_oid}>
                        OID: {a.phyloseq_oid}{a.created_at ? ` — ${new Date(a.created_at).toLocaleDateString('pt-BR')}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    padding: '7px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)',
                  }}>
                    Faça upload de um .rds primeiro
                  </div>
                )}
              </div>
              <button onClick={handleEnqueue} disabled={enqueueing || !selectedOid} style={{
                alignSelf: 'flex-end', padding: '7px 18px',
                background: enqueueing || !selectedOid ? 'var(--surface-2)' : 'var(--green)',
                color: enqueueing || !selectedOid ? 'var(--text-3)' : '#050d1a',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: enqueueing || !selectedOid ? 'not-allowed' : 'pointer',
              }}>
                {enqueueing ? 'Enfileirando...' : 'Enfileirar'}
              </button>
            </div>
          </div>
        )}

        {!jobs && !jobsError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
          </div>
        )}

        {jobs && jobs.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <span className="empty-state-icon">◌</span>
            <span className="empty-state-title">Nenhuma analise enfileirada.</span>
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <div className="jobs-table">
            <div className="jobs-table-header" style={{ gridTemplateColumns: '130px 1fr 90px 140px 36px' }}>
              <span>Job ID</span><span>Tipo</span><span>Status</span><span>Criado em</span><span />
            </div>
            {jobs.map((j: Job) => (
              <div key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  className="jobs-row"
                  style={{ gridTemplateColumns: '130px 1fr 90px 140px 36px', ...(j.status === 'done' ? { cursor: 'pointer' } : {}) }}
                  onClick={() => j.status === 'done' && (window.location.href = `/analysis/${j.id}`)}
                  title={j.status === 'done' ? 'Ver análise completa' : undefined}
                >
                  <span className="job-id mono" title={j.id}>{j.id.slice(0, 8)}…</span>
                  <span className="job-type mono">{j.job_type}</span>
                  <span>{jobStatusBadge(j.status)}</span>
                  <span className="job-time">{j.created_at ? new Date(j.created_at).toLocaleString('pt-BR') : '—'}</span>
                  {j.status === 'done' ? (
                    <Link href={`/analysis/${j.id}`} onClick={e => e.stopPropagation()}
                      style={{ color: 'var(--cyan)', fontSize: 16, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                      title="Ver análise">→</Link>
                  ) : <span />}
                </div>
                {j.status === 'failed' && j.error_msg && (
                  <div style={{
                    padding: '6px 12px 10px 12px', background: 'rgba(239,68,68,0.05)',
                    borderTop: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 1 }}>✗</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)', opacity: 0.85, wordBreak: 'break-all', lineHeight: 1.5 }}>
                      {j.error_msg}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
