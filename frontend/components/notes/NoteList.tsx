'use client';

import { NoteCard } from './NoteCard';
import { FileText } from 'lucide-react';
import type { Note } from '@/types';

interface Props {
  notes: Note[];
}

export function NoteList({ notes }: Props) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No notes yet</p>
        <p className="text-xs text-muted-foreground/60">Click &ldquo;New note&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      {notes.map(note => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
