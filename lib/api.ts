const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export async function apiFetchWithToken<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (res.status === 401) throw new Error('Unauthorized')
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
  uploadFastqPair:  (r1: File, r2: File, projectId: string) => {
                      const form = new FormData()
                      form.append('r1', r1)
                      form.append('r2', r2)
                      form.append('project_id', projectId)
                      return fetch(`${API_URL}/api/v1/samples/upload-pair`, { method: 'POST', body: form })
                        .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json() }) as Promise<UploadPairResult>
                    },
  uploadArtifact:   (file: File, projectId: string) => {
                      const form = new FormData()
                      form.append('file', file)
                      form.append('project_id', projectId)
                      return fetch(`${API_URL}/api/v1/samples/artifact-upload`, { method: 'POST', body: form })
                        .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json() }) as Promise<ArtifactUploadResult>
                    },
  enqueueJob:       (projectId: string, jobType: string, phyloseqOid?: number) =>
                      apiFetch<{ job_id: string }>('/api/v1/jobs/enqueue', {
                        method: 'POST',
                        body: JSON.stringify({
                          project_id: projectId,
                          job_type: jobType,
                          payload: {},
                          phyloseq_oid: phyloseqOid ?? null,
                        }),
                      }),
  getArtifacts:     (projectId: string) =>
                      apiFetch<ProjectArtifacts>(`/api/v1/samples/${projectId}/artifacts`),

  // Auth-required endpoints
  getMe:           (token: string) =>
                     apiFetchWithToken<UserProfile>('/api/v1/auth/me', token),
  getAdminUsers:   (token: string) =>
                     apiFetchWithToken<AdminUser[]>('/api/v1/admin/users', token),
  getAdminInvites: (token: string) =>
                     apiFetchWithToken<Invite[]>('/api/v1/admin/invites', token),
  createInvite:    (token: string, email: string, role: string) =>
                     apiFetchWithToken<Invite>('/api/v1/admin/invites', token, {
                       method: 'POST',
                       body: JSON.stringify({ email, role }),
                     }),
  deleteInvite:    (token: string, id: string) =>
                     apiFetchWithToken<void>(`/api/v1/admin/invites/${id}`, token, { method: 'DELETE' }),
  updateUserRole:  (token: string, userId: string, role: string) =>
                     apiFetchWithToken<void>(`/api/v1/admin/users/${userId}/role`, token, {
                       method: 'PATCH',
                       body: JSON.stringify({ role }),
                     }),
  deactivateUser:  (token: string, userId: string) =>
                     apiFetchWithToken<void>(`/api/v1/admin/users/${userId}/deactivate`, token, { method: 'PATCH' }),

  createProject: (token: string, body: CreateProjectBody) =>
                   apiFetchWithToken<{ id: string }>('/api/v1/projects/', token, {
                     method: 'POST',
                     body: JSON.stringify(body),
                   }),
}

export interface AnalysisConfig {
  analysis_type: string
  charts: string[]
}

export interface Project {
  id: string
  code: string
  name: string
  description: string
  marker_type: '16S' | 'ITS'
  status: string
  analyses: AnalysisConfig[]
}

export interface CreateProjectBody {
  code: string
  name: string
  description: string
  marker_type: '16S' | 'ITS'
  analyses: AnalysisConfig[]
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
  fastq_r1_oid: number
  fastq_r2_oid: number
  created_at: string
}

export interface UploadPairResult {
  sample_id: string
  treatment_group: string
  replicate: number
  parsed: {
    marker_type: string
    sample_number: string
    treatment_group: string
    replicate: number
    read_pair: string
  }
}

export interface ArtifactUploadResult {
  oid: number
  project_id: string
}

export interface ProjectArtifacts {
  available: Array<{ job_id: string; phyloseq_oid: number; created_at: string | null }>
  project_code: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  last_login: string | null
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  last_login: string | null
}

export interface Invite {
  id: string
  email: string
  role: string
  invited_at: string
  used_at: string | null
}
