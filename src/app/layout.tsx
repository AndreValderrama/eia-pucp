import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'EnviroWise EIA',
  description: 'Environmental Impact Assessment Tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <div className="flex flex-col flex-1 min-h-screen">
              <AppHeader />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-auto">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
