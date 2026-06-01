# bio-frontend

Interface web da plataforma de análise de micobioma e transcriptômica — TCC de bioinformática.

Next.js 14 (App Router) com visualizações científicas interativas via Plotly.js e Cytoscape.js.

---

## Contexto

Frontend para acompanhar e visualizar as análises de três projetos paralelos (INOVAHERB, Pós-Fogo, Biorremediação). Consome a API REST do [bio-platform](../bio-platform) e recebe atualizações em tempo real via WebSocket.

**Regra de ouro:** toda visualização (PCoA, volcano plot, rede microbiana, heatmap) é gerada aqui — o backend R nunca produz figuras.

---

## Stack

| Lib | Uso |
|-----|-----|
| Next.js 14 App Router | Roteamento e SSR |
| Plotly.js | PCoA, volcano plot, MA plot, heatmaps |
| Cytoscape.js | Redes microbianas interativas (SpiecEasi) |
| Recharts | Barras de progresso, histórico de jobs |
| SWR | Cache e revalidação de dados da API |
| WebSocket nativo | Status de jobs em tempo real |

---

## Rodar localmente

```bash
cp .env.example .env.local
npm install
npm run dev
```

Sobe em `http://localhost:3000`. Requer o [bio-platform](../bio-platform) rodando em `:8000`.

Para build de produção:

```bash
npm run build
npm start
```

---

## Rotas

| Rota | O que mostra | Biblioteca |
|------|-------------|-----------|
| `/` | Home com navegação | — |
| `/projects` | Lista dos 3 projetos com status | SWR |
| `/analysis/[id]` | Volcano plot, MA plot, tabela de DEGs | Plotly.js |
| `/network/[id]` | Rede microbiana interativa (SpiecEasi/NetCoMi) | Cytoscape.js |
| `/diversity` | PCoA beta diversity, alpha diversity | Plotly.js |
| `/cross-project` | 6 PCoAs — figura central do TCC | Plotly.js subplots |
| `/jobs` | Fila de análises em tempo real | WebSocket + Recharts |

---

## Estrutura de pastas

```
bio-frontend/
├── app/                    → páginas (App Router)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── projects/
│   ├── analysis/[id]/
│   ├── network/[id]/
│   ├── diversity/
│   ├── cross-project/
│   └── jobs/
├── lib/
│   ├── api.ts              → cliente tipado para a API REST
│   └── websocket.ts        → conexão WebSocket para status de jobs
└── components/             → (a criar conforme necessário)
    ├── charts/             → wrappers Plotly reutilizáveis
    ├── network/            → wrappers Cytoscape
    └── ui/                 → componentes genéricos
```

---

## Comunicação com o backend

### REST (dados)

```typescript
import { api } from '@/lib/api'

const projects = await api.getProjects()
const results  = await api.getAnalysisResults(jobId)
const degs     = await api.searchDegs('Desulfovibrio', 'biorremediation')
```

Todas as chamadas passam por `lib/api.ts` — nenhuma página faz `fetch` direto.

### WebSocket (tempo real)

```typescript
import { connectJobStatusSocket } from '@/lib/websocket'

const disconnect = connectJobStatusSocket((jobId, status) => {
  // status: 'queued' | 'running' | 'done' | 'failed'
})
```

---

## Adicionar um novo gráfico

1. Criar componente em `components/charts/MeuGrafico.tsx`
2. Importar `Plot` com `dynamic(() => import('react-plotly.js'), { ssr: false })` — Plotly não roda no servidor
3. Consumir dados via `useSWR` apontando para `api.*`
4. Adicionar a rota em `app/` se for uma página nova

Exemplo mínimo de gráfico Plotly:

```tsx
'use client'
import dynamic from 'next/dynamic'
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export function VolcanoPlot({ degs }: { degs: DegResult[] }) {
  return (
    <Plot
      data={[{
        type: 'scatter',
        mode: 'markers',
        x: degs.map(d => d.log2_fold_change),
        y: degs.map(d => -Math.log10(d.p_adjusted)),
        text: degs.map(d => d.gene_id),
      }]}
      layout={{ title: 'Volcano Plot', xaxis: { title: 'log2FC' }, yaxis: { title: '-log10(padj)' } }}
    />
  )
}
```

---

## Figura do TCC — 6 PCoAs

A rota `/cross-project` monta o painel final automaticamente quando o evento `CrossProjectFigureReady` chega via WebSocket. O layout é um grid 3×2:

```
INOVAHERB     │ Bray-Curtis PCoA  │ UniFrac PCoA
Pós-Fogo      │ Bray-Curtis PCoA  │ UniFrac PCoA
Biorremediação│ Bray-Curtis PCoA  │ UniFrac PCoA
```

Implementado em `app/cross-project/page.tsx` com `Plotly subplots (grid: {rows:3, columns:2})`.

---

## Variáveis de ambiente

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000   # URL da API REST
NEXT_PUBLIC_WS_URL=ws://localhost:8000      # URL do WebSocket
```

Em produção, apontam para o ingress do k3s (`http://bio.local`).

---

## Deploy

A imagem Docker é multi-stage (builder → runner) com output `standalone`:

```bash
docker build -t ghcr.io/org/bio-frontend:latest .
docker push ghcr.io/org/bio-frontend:latest
```

O manifest k3s do frontend fica em `bio-platform/infra/manifests/` junto com os demais serviços.
