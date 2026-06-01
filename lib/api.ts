const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  getProjects:       () => apiFetch<Project[]>('/api/v1/projects/'),
  getProject:        (id: string) => apiFetch<Project>(`/api/v1/projects/${id}`),
  getJobs:           (projectId: string) => apiFetch<Job[]>(`/api/v1/jobs/${projectId}`),
  getWorkerStatus:   () => apiFetch<WorkerStatus>('/api/v1/worker/status'),
  getAnalysisResults:(jobId: string) => apiFetch<AnalysisResult[]>(`/api/v1/analysis/${jobId}/results`),
  searchDegs: (q: string, project?: string) => {
    const params = new URLSearchParams({ q, ...(project ? { project } : {}) })
    return apiFetch<DegResult[]>(`/api/v1/analysis/search/degs?${params}`)
  },
  getSamples:       (projectId: string) => apiFetch<Sample[]>(`/api/v1/samples/${projectId}`),
  getPresignedPair: (r1filename: string, projectId: string) =>
                      apiFetch<PresignedPair>('/api/v1/samples/presigned-pair', {
                        method: 'POST',
                        body: JSON.stringify({ r1_filename: r1filename, project_id: projectId }),
                      }),
  confirmPair:      (body: ConfirmPairBody) =>
                      apiFetch<{ sample_id: string }>('/api/v1/samples/confirm-pair', {
                        method: 'POST',
                        body: JSON.stringify(body),
                      }),
  enqueueJob:       (projectId: string, jobType: string, payload: Record<string, string>) =>
                      apiFetch<{ job_id: string }>('/api/v1/jobs/enqueue', {
                        method: 'POST',
                        body: JSON.stringify({ project_id: projectId, job_type: jobType, payload }),
                      }),
  getArtifacts:       (projectId: string) =>
                        apiFetch<ProjectArtifacts>(`/api/v1/samples/${projectId}/artifacts`),
  getArtifactUploadUrl: (projectId: string, filename: string) =>
                        apiFetch<ArtifactUploadUrl>('/api/v1/samples/artifact-upload-url', {
                          method: 'POST',
                          body: JSON.stringify({ project_id: projectId, filename }),
                        }),
}

export interface Project {
  id: string
  code: string
  name: string
  marker_type: '16S' | 'ITS'
  status: string
}

export interface Job {
  id: string
  project_id: string
  job_type: string
  status: 'queued' | 'running' | 'done' | 'failed'
  created_at: string
  completed_at: string | null
  error_msg: string | null
}

export interface AnalysisResult {
  id: string
  job_id: string
  analysis_type: string
  result_data: Record<string, unknown>
}

export interface DegResult {
  gene_id: string
  log2_fold_change: number
  p_adjusted: number
  base_mean: number
}

export interface RunningJob {
  id: string
  job_type: string
  project_code: string
  project_name: string
  elapsed_s: number
  estimated_s: number
  progress_pct: number
  remaining_s: number
}

export interface RecentJob {
  id: string
  job_type: string
  status: 'done' | 'failed'
  project_code: string
  seconds_ago: number
  error_msg: string | null
}

export interface WorkerStatus {
  running: RunningJob[]
  queued_count: number
  recent: RecentJob[]
}

export interface Sample {
  id: string
  project_id: string
  filename: string
  treatment_group: string
  replicate: number
  fastq_r1_key: string
  fastq_r2_key: string
  created_at: string
}

export interface PresignedPair {
  r1: { upload_url: string; key: string }
  r2: { upload_url: string; key: string }
  parsed: {
    marker_type: string
    sample_number: string
    treatment_group: string
    replicate: number
    read_pair: string
  }
}

export interface ConfirmPairBody {
  project_id: string
  r1_key: string
  r2_key: string
  r1_filename: string
}

export interface ProjectArtifacts {
  default_key: string
  available: string[]
  project_code: string
}

export interface ArtifactUploadUrl {
  upload_url: string
  key: string
  bucket: string
  object_key: string
}
