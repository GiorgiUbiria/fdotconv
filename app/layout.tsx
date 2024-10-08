import type { Metadata } from 'next';
import { Roboto_Mono as FontSans } from 'next/font/google';

import { ThemeProvider } from '@/providers/theme-provider';
import { NavigationBar } from '@/components/navigation-bar';
import { Toaster } from '@/components/ui/sonner';
import { ConversionStoreProvider } from '@/providers/conversion-store-provider';

import { cn } from '@/lib/utils';

import './globals.css';
import { Footer } from '@/components/footer';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ConversionStoreProvider>
            <NavigationBar />
            <main>{children}</main>
            <Footer />
            <Toaster />
          </ConversionStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
