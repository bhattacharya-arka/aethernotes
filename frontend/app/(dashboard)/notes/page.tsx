'use client';

import { useStore } from '@/store/useStore';
import { NoteEditor } from '@/components/editor/NoteEditor';
import { EmptyState }  from '@/components/notes/EmptyState';

export default function NotesPage() {
  const selectedNoteId = useStore(s => s.selectedNoteId);

  return (
    <div className="flex-1 overflow-hidden h-full">
      {selectedNoteId ? (
        <NoteEditor noteId={selectedNoteId} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
