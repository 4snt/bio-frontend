import Image from 'next/image'

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      flexWrap: 'wrap',
      background: 'var(--surface)',
    }}>
      <Image
        src="/logo_decom.png"
        alt="DECOM — Departamento de Computação UFVJM"
        width={100}
        height={40}
        style={{ objectFit: 'contain', opacity: 0.85 }}
      />
      <Image
        src="/logo_nebim.svg"
        alt="NEBIM — Núcleo de Estudos em Biologia Integrativa e Micobioma"
        width={120}
        height={40}
        style={{ objectFit: 'contain', opacity: 0.85 }}
      />
      <Image
        src="/logo_inovaherb.png"
        alt="INOVAHERB — Grupos de Pesquisa em Manejo Sustentável de Plantas Daninhas"
        width={110}
        height={40}
        style={{ objectFit: 'contain', opacity: 0.85 }}
      />
    </footer>
  )
}
