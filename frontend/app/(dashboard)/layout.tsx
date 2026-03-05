'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsAuthed } from '@/store/useStore';
import { Sidebar }     from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/command/CommandPalette';
import { SearchModal }    from '@/components/search/SearchModal';
import { useWebSocket }   from '@/hooks/useWebSocket';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthed  = useIsAuthed();
  const router    = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  // Only redirect after Zustand has rehydrated from localStorage
  useEffect(() => {
    if (hydrated && !isAuthed) router.replace('/login');
  }, [isAuthed, router, hydrated]);

  // Live WebSocket connection
  useWebSocket();
  // Flush offline mutations on reconnect
  useOfflineSync();

  if (!hydrated || !isAuthed) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
      <CommandPalette />
      <SearchModal />
    </div>
  );
}
