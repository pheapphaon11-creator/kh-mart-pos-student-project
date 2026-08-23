'use client';

import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';

import { ConfirmProvider } from '@/context/ConfirmContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{ 
        fetcher,
        refreshInterval: 60000, // Refresh data every 1 minute in the background
        revalidateOnFocus: false, // Prevent aggressive re-fetching when switching tabs
        dedupingInterval: 10000, // Deduplicate requests within 10 seconds
        keepPreviousData: true, // Keep showing previous data to prevent loading flashes
      }}
    >
      <ThemeProvider>
        <LanguageProvider>
          <ConfirmProvider>
            <SessionProvider>{children}</SessionProvider>
          </ConfirmProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
