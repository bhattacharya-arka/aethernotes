// ──────────────────────────────────────────────────────────────
//  AetherNotes – shared TypeScript types
// ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: string;
  username: string;
  email: string;
  expiresIn: number;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;        // decrypted plaintext (populated by backend)
  favorite: boolean;
  createdAt: string;      // ISO-8601
  updatedAt: string;
  tags: string[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  validationErrors?: Record<string, string>;
}

// ── Request payloads ──────────────────────────────────────────

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateNotePayload {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  tags?: string[];
  favorite?: boolean;
}

// ── Offline queue ─────────────────────────────────────────────

export type MutationKind = 'CREATE' | 'UPDATE' | 'DELETE';

export interface PendingMutation {
  id?: number;
  kind: MutationKind;
  noteId?: string;
  payload?: CreateNotePayload | UpdateNotePayload;
  createdAt: number;  // epoch ms
}

// ── WebSocket ─────────────────────────────────────────────────

export type WsAction = 'CREATED' | 'UPDATED' | 'DELETED';

export interface WsNoteUpdate {
  action: WsAction;
  noteId: string;
  userId: string;
  title: string;
  updatedAt: string;
}
