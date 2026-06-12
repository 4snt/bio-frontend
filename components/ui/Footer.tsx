import Image from 'next/image'

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      flexWrap: 'wrap',
      background: 'var(--surface)',
      flexShrink: 0,
    }}>
      <Image
        src="/logo_decom.png"
        alt="DECOM — Departamento de Computação UFVJM"
        width={80}
        height={32}
        style={{ objectFit: 'contain', opacity: 0.8, maxWidth: '25vw', height: 'auto' }}
      />
      <Image
        src="/logo_nebim.svg"
        alt="NEBIM"
        width={100}
        height={32}
        style={{ objectFit: 'contain', opacity: 0.8, maxWidth: '28vw', height: 'auto' }}
      />
      <Image
        src="/logo_inovaherb.png"
        alt="INOVAHERB"
        width={90}
        height={32}
        style={{ objectFit: 'contain', opacity: 0.8, maxWidth: '25vw', height: 'auto' }}
      />
    </footer>
  )
}
