import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/ui/Sidebar'

export const metadata: Metadata = {
  title: 'Bio-Platform',
  description: 'Plataforma de análise de micobioma e transcriptômica',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
