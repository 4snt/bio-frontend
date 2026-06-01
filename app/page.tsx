import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Bio-Platform</h1>
      <nav style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <Link href="/projects">Projetos</Link>
        <Link href="/jobs">Fila de Jobs</Link>
        <Link href="/diversity">Diversidade</Link>
        <Link href="/cross-project">Figura TCC</Link>
      </nav>
    </main>
  )
}
