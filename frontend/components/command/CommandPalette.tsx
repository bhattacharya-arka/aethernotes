'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useTheme }  from 'next-themes';
import {
  FilePlus2, Search, Star, Moon, Sun, LogOut, FileText,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useStore }     from '@/store/useStore';
import { useNotes, useCreateNote } from '@/hooks/useNotes';
import { authApi }      from '@/lib/api';
import { toast }        from 'sonner';
import { cn }           from '@/lib/utils';

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const { commandOpen, closeCommand, openSearch, setSelectedNote, logout } = useStore();
  const { data: notesData } = useNotes();
  const createNote = useCreateNote();

  const notes = notesData?.content ?? [];

  // Open on Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useStore.getState().commandOpen
          ? useStore.getState().closeCommand()
          : useStore.getState().openCommand();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const run = (fn: () => void) => {
    closeCommand();
    fn();
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ok */ }
    logout();
    toast.success('Signed out');
    router.push('/login');
  };

  return (
    <Dialog open={commandOpen} onOpenChange={v => !v && closeCommand()}>
      <DialogContent className="p-0 gap-0 max-w-md overflow-hidden">
        <Command className="rounded-lg" shouldFilter>
          <div className="flex items-center border-b px-3 gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Type a command or search…"
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No commands found
            </Command.Empty>

            {/* Actions */}
            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-medium">
              <CmdItem
                icon={FilePlus2}
                label="New note"
                shortcut="N"
                onSelect={() => run(() => createNote.mutate({ title: 'Untitled', content: '' }))}
              />
              <CmdItem
                icon={Search}
                label="Search notes"
                shortcut="⌘/"
                onSelect={() => run(openSearch)}
              />
              <CmdItem
                icon={Star}
                label="View favorites"
                onSelect={() => run(() => {})}
              />
            </Command.Group>

            {/* Recent notes */}
            {notes.length > 0 && (
              <Command.Group heading="Recent notes" className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-medium mt-1">
                {notes.slice(0, 5).map(note => (
                  <CmdItem
                    key={note.id}
                    icon={FileText}
                    label={note.title || 'Untitled'}
                    onSelect={() => run(() => setSelectedNote(note.id))}
                  />
                ))}
              </Command.Group>
            )}

            {/* Appearance */}
            <Command.Group heading="Appearance" className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-medium mt-1">
              <CmdItem
                icon={theme === 'dark' ? Sun : Moon}
                label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
              />
            </Command.Group>

            {/* Account */}
            <Command.Group heading="Account" className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-medium mt-1">
              <CmdItem
                icon={LogOut}
                label="Sign out"
                onSelect={() => run(handleLogout)}
                destructive
              />
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground/60 flex gap-4">
            <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="bg-muted px-1 rounded">↵</kbd> select</span>
            <span><kbd className="bg-muted px-1 rounded">esc</kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CmdItem({
  icon: Icon, label, shortcut, onSelect, destructive = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm cursor-pointer',
        'aria-selected:bg-accent transition-colors',
        destructive && 'aria-selected:bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
