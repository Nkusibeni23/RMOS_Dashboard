import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'RMSoft OS Dashboard',
  description: 'Manage RMSoft OS devices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-grid min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
