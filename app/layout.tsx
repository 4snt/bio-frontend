import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bio-Platform',
  description: 'Plataforma de análise de micobioma e transcriptômica',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
