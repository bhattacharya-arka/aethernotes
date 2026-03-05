'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Star, Tag, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TipTapEditor } from './TipTapEditor';
import { Badge }    from '@/components/ui/badge';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNote, useUpdateNote, useDeleteNote } from '@/hooks/useNotes';
import { useStore } from '@/store/useStore';
import { debounce } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props { noteId: string }

export function NoteEditor({ noteId }: Props) {
  const { data: note, isLoading, isError } = useNote(noteId);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const setSelectedNote = useStore(s => s.setSelectedNote);

  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Sync local state when note loads / changes
  useEffect(() => {
    if (note) {
      setTitle(note.title ?? '');
      setContent(note.content ?? '');
    }
  }, [note?.id]); // only re-sync on note switch

  // ── Auto-save helpers ─────────────────────────────────────

  const persist = useCallback(
    async (updates: { title?: string; content?: string }) => {
      setSaving(true);
      setSaved(false);
      try {
        await updateNote.mutateAsync({ id: noteId, data: updates });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        toast.error('Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [noteId, updateNote],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSaveTitle   = useCallback(debounce((t: string) => persist({ title: t }), 800),  [persist]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSaveContent = useCallback(debounce((c: string) => persist({ content: c }), 1500), [persist]);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    debouncedSaveTitle(v);
  };

  const handleContentChange = (v: string) => {
    debouncedSaveContent(v);
  };

  const handleToggleFavorite = () => {
    if (!note) return;
    updateNote.mutate({ id: noteId, data: { favorite: !note.favorite } });
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      const existing = note?.tags ?? [];
      if (!existing.includes(newTag)) {
        updateNote.mutate({ id: noteId, data: { tags: [...existing, newTag] } });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updated = (note?.tags ?? []).filter(t => t !== tag);
    updateNote.mutate({ id: noteId, data: { tags: updated } });
  };

  const handleDelete = async () => {
    deleteNote.mutate(noteId);
    setSelectedNote(null);
  };

  // ── Loading states ────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="flex items-center gap-2 px-8 py-3 border-b border-border">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 flex-1 max-w-[300px] rounded" />
        </div>
        <div className="flex-1 px-8 lg:px-16 xl:px-24 py-6 space-y-4 max-w-3xl mx-auto w-full">
          <Skeleton className="h-10 w-3/4 rounded" />
          <div className="space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 rounded ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Note not found or failed to load.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--editor-bg))] note-fade-in">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border shrink-0">
        {/* Tags toggle */}
        <button
          onClick={() => setShowTags(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Tag className="h-3.5 w-3.5" />
          {(note.tags?.length ?? 0) > 0
            ? note.tags.join(', ')
            : 'Add tags…'}
        </button>

        {/* Status + actions */}
        <div className="flex items-center gap-1">
          {/* Save indicator */}
          <span className="text-[11px] text-muted-foreground/60 mr-1 w-16 text-right">
            {saving ? (
              <span className="flex items-center justify-end gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving
              </span>
            ) : saved ? (
              <span className="flex items-center justify-end gap-1 text-green-500">
                <Check className="h-3 w-3" /> Saved
              </span>
            ) : 'Auto-saved'}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={handleToggleFavorite}
              >
                <Star className={cn('h-4 w-4', note.favorite ? 'fill-yellow-400 text-yellow-400' : '')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{note.favorite ? 'Unfavorite' : 'Favorite'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete note</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Tag editor ── */}
      {showTags && (
        <div className="px-8 lg:px-16 xl:px-24 pt-3 pb-1 max-w-3xl mx-auto w-full flex flex-wrap gap-1.5 items-center animate-slide-up">
          {(note.tags ?? []).map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => handleRemoveTag(tag)}>
              {tag}
              <span className="text-muted-foreground hover:text-destructive">×</span>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tag…"
            className="h-6 w-28 text-xs border-dashed bg-transparent"
          />
        </div>
      )}

      {/* ── Title ── */}
      <div className="px-8 lg:px-16 xl:px-24 pt-6 pb-1 max-w-3xl mx-auto w-full">
        <textarea
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          rows={1}
          className="w-full resize-none bg-transparent text-3xl font-bold tracking-tight placeholder:text-muted-foreground/40 focus:outline-none leading-tight"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); }
          }}
        />
      </div>

      {/* ── TipTap editor body ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <TipTapEditor
          content={content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
