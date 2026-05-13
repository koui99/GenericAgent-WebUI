import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { I18nProvider } from '@/lib/i18n/provider';
import { getServerT } from '@/lib/i18n/server';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export function generateMetadata(): Metadata {
  const { t } = getServerT();
  return {
    title: t('app.name'),
    description: t('app.description'),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = getServerT();
  return (
    <html lang={locale === 'zh' ? 'zh-CN' : 'en'} suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <I18nProvider initialLocale={locale}>
          <ThemeProvider>{children}</ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
