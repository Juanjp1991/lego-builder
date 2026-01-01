import type { Metadata } from 'next';
import { ScanContent } from './ScanContent';

export const metadata: Metadata = {
  title: 'Scan Bricks | Lego Builder',
  description: 'Scan your LEGO bricks to add them to your inventory',
};

export default function ScanPage() {
  return (
    <main className="min-h-screen bg-background">
      <ScanContent />
    </main>
  );
}
