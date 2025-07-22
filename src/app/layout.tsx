import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { Poppins } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Adonay Express',
  description: 'Aplicación para gestionar pedidos de un catálogo de productos.',
};

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="es" className={`dark ${poppins.variable}`}>
      <body className={`font-body antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
