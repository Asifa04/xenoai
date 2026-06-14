import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'XenoAI – Marketing Copilot',
  description: 'AI-native CRM for reaching shoppers intelligently',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <main style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--bg)',
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
