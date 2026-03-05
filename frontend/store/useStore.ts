import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { User } from '@/types';

interface AppState {
  // ── Auth ──────────────────────────────────────────────────
  user:  User | null;
  token: string | null;

  // ── UI ────────────────────────────────────────────────────
  selectedNoteId:   string | null;
  sidebarCollapsed: boolean;
  searchOpen:       boolean;
  commandOpen:      boolean;

  // ── Actions ───────────────────────────────────────────────
  setUser:           (user: User | null) => void;
  setToken:          (token: string | null) => void;
  setSelectedNote:   (id: string | null) => void;
  toggleSidebar:     () => void;
  openSearch:        () => void;
  closeSearch:       () => void;
  openCommand:       () => void;
  closeCommand:      () => void;
  logout:            () => void;
}

export const useStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        user:             null,
        token:            null,
        selectedNoteId:   null,
        sidebarCollapsed: false,
        searchOpen:       false,
        commandOpen:      false,

        setUser:  user  => set({ user }),
        setToken: token => {
          set({ token });
          if (typeof window !== 'undefined') {
            token
              ? localStorage.setItem('access_token', token)
              : localStorage.removeItem('access_token');
          }
        },

        setSelectedNote:   id    => set({ selectedNoteId: id }),
        toggleSidebar:     ()    => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
        openSearch:        ()    => set({ searchOpen: true }),
        closeSearch:       ()    => set({ searchOpen: false }),
        openCommand:       ()    => set({ commandOpen: true }),
        closeCommand:      ()    => set({ commandOpen: false }),

        logout: () => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
          }
          set({ user: null, token: null, selectedNoteId: null });
        },
      }),
      {
        name: 'aethernotes-store',
        partialize: state => ({ user: state.user, token: state.token }),
      },
    ),
  ),
);

// Convenience selectors
export const useUser         = () => useStore(s => s.user);
export const useToken        = () => useStore(s => s.token);
export const useIsAuthed     = () => useStore(s => !!s.token && !!s.user);
export const useSelectedNote = () => useStore(s => s.selectedNoteId);
