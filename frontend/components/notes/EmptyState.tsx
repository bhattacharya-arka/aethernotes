'use client';

import { FilePlus2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { useCreateNote } from '@/hooks/useNotes';

export function EmptyState() {
  const openCommand = useStore(s => s.openCommand);
  const create = useCreateNote();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-5 max-w-sm px-6 animate-slide-up">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">Select a note</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Choose a note from the sidebar or create a new one to start writing.
            All notes are encrypted with AES-256-GCM.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            onClick={() => create.mutate({ title: 'Untitled', content: '' })}
            disabled={create.isPending}
          >
            <FilePlus2 className="h-4 w-4" />
            New note
          </Button>
          <Button variant="outline" size="sm" onClick={openCommand}>
            Open command palette
            <kbd className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
          </Button>
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground/60 space-y-1 text-left border border-border rounded-lg p-3">
          <p className="font-medium text-muted-foreground">Keyboard shortcuts</p>
          <div className="flex justify-between"><span>Command palette</span><kbd className="bg-muted px-1 rounded">⌘K</kbd></div>
          <div className="flex justify-between"><span>Search notes</span><kbd className="bg-muted px-1 rounded">⌘/</kbd></div>
        </div>
      </div>
    </div>
  );
}
