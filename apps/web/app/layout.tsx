import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import AimShell from './components/AimShell';

export const metadata: Metadata = {
  title: 'AIM Tank Integrity',
  description: 'AIM+n8n Tank Integrity Module'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><AimShell>{children}</AimShell></body>
    </html>
  );
}
