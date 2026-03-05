'use client';

import React from 'react';
import { Star, Trash2, MoreHorizontal } from 'lucide-react';
import { cn, formatDate, truncate, stripMarkdown } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore }      from '@/store/useStore';
import { useUpdateNote, useDeleteNote } from '@/hooks/useNotes';
import type { Note } from '@/types';

interface Props { note: Note }

export function NoteCard({ note }: Props) {
  const { selectedNoteId, setSelectedNote } = useStore();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const isSelected = selectedNoteId === note.id;
  const preview    = truncate(stripMarkdown(note.content ?? ''), 80);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNote.mutate({ id: note.id, data: { favorite: !note.favorite } });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNote.mutate(note.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setSelectedNote(note.id)}
      onKeyDown={e => e.key === 'Enter' && setSelectedNote(note.id)}
      className={cn(
        'group relative w-full text-left rounded-lg px-3 py-2.5 cursor-pointer transition-colors select-none',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50',
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <p className={cn(
          'text-sm font-medium leading-snug truncate',
          !isSelected && 'text-foreground',
        )}>
          {note.title || 'Untitled'}
        </p>

        {/* Actions (hover) */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleFavorite}
            className="p-0.5 rounded hover:bg-background/50 transition-colors"
          >
            <Star className={cn('h-3 w-3', note.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <button className="p-0.5 rounded hover:bg-background/50 transition-colors">
                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleToggleFavorite}>
                <Star className="h-3.5 w-3.5 mr-2" />
                {note.favorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
          {preview}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] text-muted-foreground/70 shrink-0">
          {formatDate(note.updatedAt)}
        </span>
        {note.tags?.slice(0, 2).map(tag => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {tag}
          </Badge>
        ))}
        {(note.tags?.length ?? 0) > 2 && (
          <span className="text-[10px] text-muted-foreground">+{note.tags.length - 2}</span>
        )}
      </div>
    </div>
  );
}
