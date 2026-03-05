'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools }   from '@tanstack/react-query-devtools';
import { ThemeProvider }        from 'next-themes';
import { Toaster }              from 'sonner';
import { queryClient }          from '@/lib/queryClient';
import { TooltipProvider }      from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' },
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
