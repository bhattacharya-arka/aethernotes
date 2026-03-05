'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPendingMutations, clearMutation } from '@/lib/db';
import { notesApi } from '@/lib/api';
import { noteKeys } from '@/hooks/useNotes';
import type { CreateNotePayload, UpdateNotePayload } from '@/types';

/**
 * Listens for the browser coming back online and flushes any
 * queued offline mutations in order.
 */
export function useOfflineSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const flush = async () => {
      const mutations = await getPendingMutations();
      if (mutations.length === 0) return;

      toast.info(`Syncing ${mutations.length} offline change(s)…`);
      let synced = 0;

      for (const m of mutations) {
        try {
          switch (m.kind) {
            case 'CREATE':
              await notesApi.create(m.payload as CreateNotePayload);
              break;
            case 'UPDATE':
              if (m.noteId)
                await notesApi.update(m.noteId, m.payload as UpdateNotePayload);
              break;
            case 'DELETE':
              if (m.noteId) await notesApi.delete(m.noteId);
              break;
          }
          if (m.id != null) await clearMutation(m.id);
          synced++;
        } catch {
          // Leave failed mutations in the queue for next time
        }
      }

      if (synced > 0) {
        qc.invalidateQueries({ queryKey: noteKeys.lists() });
        toast.success(`Synced ${synced} note(s) successfully`);
      }
    };

    window.addEventListener('online', flush);
    // Also attempt on mount (catches just-reconnected state)
    if (navigator.onLine) flush();

    return () => window.removeEventListener('online', flush);
  }, [qc]);
}
