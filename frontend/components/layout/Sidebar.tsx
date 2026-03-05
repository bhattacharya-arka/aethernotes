'use client';

import React, { useState } from 'react';
import { useRouter }  from 'next/navigation';
import { useTheme }   from 'next-themes';
import { toast }      from 'sonner';
import {
  PanelLeftClose, PanelLeftOpen, Plus, Search, Command,
  Star, FileText, Tag, LogOut, Sun, Moon, Loader2, Sparkles,
} from 'lucide-react';
import { cn }             from '@/lib/utils';
import { Button }         from '@/components/ui/button';
import { ScrollArea }     from '@/components/ui/scroll-area';
import { Separator }      from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NoteList }       from '@/components/notes/NoteList';
import { useStore }       from '@/store/useStore';
import { useNotes }       from '@/hooks/useNotes';
import { useCreateNote }  from '@/hooks/useNotes';
import { authApi, getErrorMessage } from '@/lib/api';
import { getInitials }    from '@/lib/utils';

type NavSection = 'all' | 'favorites' | 'tags';

export function Sidebar() {
  const router   = useRouter();
  const { theme, setTheme } = useTheme();

  const {
    user, sidebarCollapsed, toggleSidebar,
    openSearch, openCommand, logout,
  } = useStore();

  const { data: notesData, isLoading } = useNotes();
  const createNote = useCreateNote();

  const [section, setSection] = useState<NavSection>('all');
  const [loggingOut, setLoggingOut] = useState(false);

  const notes     = notesData?.content ?? [];
  const favorites = notes.filter(n => n.favorite);

  const displayed = section === 'favorites' ? favorites : notes;

  const handleCreate = async () => {
    createNote.mutate({
      title:   'Untitled',
      content: '',
      tags:    [],
    });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch { /* ignore */ } finally {
      logout();
      toast.success('Signed out');
      router.push('/login');
    }
  };

  // ── Collapsed icon-rail ───────────────────────────────────
  if (sidebarCollapsed) {
    return (
      <aside className="flex flex-col items-center gap-2 w-14 border-r border-sidebar-border bg-sidebar py-3 aether-sidebar-transition">
        <SidebarIconBtn tooltip="Expand sidebar"   onClick={toggleSidebar}><PanelLeftOpen className="h-4 w-4" /></SidebarIconBtn>
        <div className="h-px w-8 bg-border my-1" />
        <SidebarIconBtn tooltip="New note"        onClick={handleCreate}><Plus className="h-4 w-4" /></SidebarIconBtn>
        <SidebarIconBtn tooltip="Search (⌘K)"    onClick={openSearch}><Search className="h-4 w-4" /></SidebarIconBtn>
        <SidebarIconBtn tooltip="Commands (⌘K)"  onClick={openCommand}><Command className="h-4 w-4" /></SidebarIconBtn>
        <div className="flex-1" />
        <SidebarIconBtn tooltip="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </SidebarIconBtn>
        {user && (
          <Avatar className="h-7 w-7 cursor-pointer" onClick={handleLogout}>
            <AvatarFallback className="text-[10px]">{getInitials(user.username)}</AvatarFallback>
          </Avatar>
        )}
      </aside>
    );
  }

  // ── Full sidebar ──────────────────────────────────────────
  return (
    <aside className="flex flex-col w-64 border-r border-sidebar-border bg-sidebar aether-sidebar-transition shrink-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm tracking-tight">AetherNotes</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleSidebar}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Action bar ── */}
      <div className="px-3 py-2 flex gap-1.5">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 justify-start"
          onClick={handleCreate}
          disabled={createNote.isPending}
        >
          {createNote.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Plus className="h-3.5 w-3.5" />}
          New note
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={openSearch}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Search (⌘K)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={openCommand}>
              <Command className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Command palette</TooltipContent>
        </Tooltip>
      </div>

      {/* ── Nav sections ── */}
      <div className="px-3 pb-1 flex gap-1">
        {([ ['all', FileText, 'All notes'], ['favorites', Star, 'Favorites'], ['tags', Tag, 'Tags'] ] as const).map(
          ([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setSection(key as NavSection)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-medium transition-colors',
                section === key
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          )
        )}
      </div>

      <Separator />

      {/* ── Note list ── */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <NoteList notes={displayed} />
        )}
      </ScrollArea>

      <Separator />

      {/* ── Footer ── */}
      <div className="p-3 flex items-center gap-2">
        {user && (
          <>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">{getInitials(user.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.username}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <LogOut className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sign out</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}

// Small icon button for collapsed state
function SidebarIconBtn({
  children, tooltip, onClick,
}: { children: React.ReactNode; tooltip: string; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
