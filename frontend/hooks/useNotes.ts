'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notesApi, getErrorMessage } from '@/lib/api';
import { cacheNotes, putCachedNote, deleteCachedNote, queueMutation } from '@/lib/db';
import { useStore } from '@/store/useStore';
import type { CreateNotePayload, UpdateNotePayload } from '@/types';

// ── Query keys ────────────────────────────────────────────────

export const noteKeys = {
  all:      ['notes'] as const,
  lists:    () => [...noteKeys.all, 'list'] as const,
  list:     (page: number) => [...noteKeys.lists(), page] as const,
  detail:   (id: string) => [...noteKeys.all, id] as const,
  search:   (q: string) => [...noteKeys.all, 'search', q] as const,
  favorites: () => [...noteKeys.all, 'favorites'] as const,
};

// ── Notes list ────────────────────────────────────────────────

export function useNotes(page = 0) {
  return useQuery({
    queryKey: noteKeys.list(page),
    queryFn: async () => {
      try {
        const data = await notesApi.list(page, 50);
        await cacheNotes(data.content);
        return data;
      } catch {
        // Fallback to IndexedDB cache when offline
        const { getCachedNotes } = await import('@/lib/db');
        const cached = await getCachedNotes();
        return {
          content: cached,
          page: 0,
          size: cached.length,
          totalElements: cached.length,
          totalPages: 1,
          last: true,
        };
      }
    },
    staleTime: 1000 * 60,
  });
}

// ── Single note ───────────────────────────────────────────────

export function useNote(id: string | null) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ''),
    queryFn: () => notesApi.get(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

// ── Search ────────────────────────────────────────────────────

export function useSearchNotes(query: string) {
  return useQuery({
    queryKey: noteKeys.search(query),
    queryFn: () => notesApi.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 30,
  });
}

// ── Favorites ─────────────────────────────────────────────────

export function useFavorites() {
  return useQuery({
    queryKey: noteKeys.favorites(),
    queryFn: notesApi.favorites,
    staleTime: 1000 * 60,
  });
}

// ── Create note ───────────────────────────────────────────────

export function useCreateNote() {
  const qc = useQueryClient();
  const setSelectedNote = useStore(s => s.setSelectedNote);

  return useMutation({
    mutationFn: (data: CreateNotePayload) => notesApi.create(data),

    onMutate: async (data) => {
      // Optimistic update – create a temp note
      await qc.cancelQueries({ queryKey: noteKeys.lists() });
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        userId: '',
        ...data,
        content: data.content ?? '',
        tags: data.tags ?? [],
        favorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData({ queryKey: noteKeys.lists() }, (old: unknown) => {
        if (!old) return old;
        const prev = old as { content: unknown[] };
        return { ...prev, content: [optimistic, ...prev.content] };
      });
      return { optimistic };
    },

    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
      putCachedNote(note);
      setSelectedNote(note.id);
    },

    onError: async (err, variables) => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
      // Queue for offline sync
      if (!navigator.onLine) {
        await queueMutation({ kind: 'CREATE', payload: variables, createdAt: Date.now() });
        toast.warning('Offline – note queued for sync');
      } else {
        toast.error(getErrorMessage(err));
      }
    },
  });
}

// ── Update note ───────────────────────────────────────────────

export function useUpdateNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotePayload }) =>
      notesApi.update(id, data),

    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: noteKeys.detail(id) });
      const prev = qc.getQueryData(noteKeys.detail(id));
      qc.setQueryData(noteKeys.detail(id), (old: unknown) =>
        old ? { ...(old as object), ...data, updatedAt: new Date().toISOString() } : old,
      );
      return { prev };
    },

    onSuccess: (note) => {
      qc.setQueryData(noteKeys.detail(note.id), note);
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
      putCachedNote(note);
    },

    onError: async (err, { id, data }, ctx) => {
      qc.setQueryData(noteKeys.detail(id), ctx?.prev);
      if (!navigator.onLine) {
        await queueMutation({ kind: 'UPDATE', noteId: id, payload: data, createdAt: Date.now() });
        toast.warning('Offline – change queued for sync');
      } else {
        toast.error(getErrorMessage(err));
      }
    },
  });
}

// ── Delete note ───────────────────────────────────────────────

export function useDeleteNote() {
  const qc = useQueryClient();
  const { setSelectedNote, selectedNoteId } = useStore();

  return useMutation({
    mutationFn: (id: string) => notesApi.delete(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: noteKeys.lists() });
      qc.setQueriesData({ queryKey: noteKeys.lists() }, (old: unknown) => {
        if (!old) return old;
        const prev = old as { content: Array<{ id: string }> };
        return { ...prev, content: prev.content.filter(n => n.id !== id) };
      });
      if (selectedNoteId === id) setSelectedNote(null);
    },

    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
      qc.removeQueries({ queryKey: noteKeys.detail(id) });
      deleteCachedNote(id);
      toast.success('Note deleted');
    },

    onError: (err) => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
      toast.error(getErrorMessage(err));
    },
  });
}
