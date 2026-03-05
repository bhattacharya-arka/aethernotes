'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, FileText, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input }   from '@/components/ui/input';
import { Badge }   from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore }  from '@/store/useStore';
import { useSearchNotes } from '@/hooks/useNotes';
import { useDebounce }   from '@/hooks/useDebounce';
import { formatDate, truncate, stripMarkdown } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Note } from '@/types';

export function SearchModal() {
  const { searchOpen, closeSearch, setSelectedNote } = useStore();
  const [query, setQuery] = useState('');
  const debouncedQ = useDebounce(query, 300);
  const inputRef   = useRef<HTMLInputElement>(null);

  const { data: results = [], isFetching } = useSearchNotes(debouncedQ);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Keyboard: Ctrl+/ to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        useStore.getState().openSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const select = (note: Note) => {
    setSelectedNote(note.id);
    closeSearch();
  };

  return (
    <Dialog open={searchOpen} onOpenChange={v => !v && closeSearch()}>
      <DialogContent className="p-0 max-w-xl gap-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes by title…"
            className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[420px]">
          {!debouncedQ || debouncedQ.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Clock className="h-6 w-6 opacity-50" />
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          ) : isFetching ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <FileText className="h-6 w-6 opacity-50" />
              <p className="text-sm">No notes found for &ldquo;{debouncedQ}&rdquo;</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              <p className="text-xs text-muted-foreground px-2 pb-1">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map(note => (
                <SearchResult key={note.id} note={note} query={debouncedQ} onSelect={select} />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex gap-4 text-[11px] text-muted-foreground/60">
          <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-muted px-1 rounded">↵</kbd> open</span>
          <span><kbd className="bg-muted px-1 rounded">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchResult({
  note, query, onSelect,
}: { note: Note; query: string; onSelect: (n: Note) => void }) {
  const preview = truncate(stripMarkdown(note.content ?? ''), 100);

  const highlight = (text: string) => {
    if (!query) return text;
    const re  = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(re);
    return parts.map((part, i) =>
      re.test(part) ? <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">{part}</mark> : part,
    );
  };

  return (
    <button
      onClick={() => onSelect(note)}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-accent group',
      )}
    >
      <p className="text-sm font-medium truncate">{highlight(note.title ?? 'Untitled')}</p>
      {preview && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preview}</p>}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-muted-foreground/60">{formatDate(note.updatedAt)}</span>
        {note.tags?.slice(0, 3).map(t => (
          <Badge key={t} variant="outline" className="text-[10px] px-1 py-0 h-4">{t}</Badge>
        ))}
      </div>
    </button>
  );
}
