import axios, { AxiosError } from 'axios';
import type {
  AuthResponse, Note, PagedResponse, Tag,
  LoginPayload, RegisterPayload, CreateNotePayload, UpdateNotePayload,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Axios instance ────────────────────────────────────────────

export const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach JWT from localStorage on every request
http.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 → clear session and redirect to login
http.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('aethernotes-store');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth API ──────────────────────────────────────────────────

export const authApi = {
  register:  (data: RegisterPayload)  => http.post<AuthResponse>('/api/auth/register', data).then(r => r.data),
  login:     (data: LoginPayload)     => http.post<AuthResponse>('/api/auth/login', data).then(r => r.data),
  logout:    ()                       => http.post('/api/auth/logout').then(r => r.data),
  me:        ()                       => http.get('/api/auth/me').then(r => r.data),
};

// ── Notes API ─────────────────────────────────────────────────

export const notesApi = {
  list: (page = 0, size = 50) =>
    http.get<PagedResponse<Note>>('/api/notes', { params: { page, size } }).then(r => r.data),

  get: (id: string) =>
    http.get<Note>(`/api/notes/${id}`).then(r => r.data),

  create: (data: CreateNotePayload) =>
    http.post<Note>('/api/notes', data).then(r => r.data),

  update: (id: string, data: UpdateNotePayload) =>
    http.put<Note>(`/api/notes/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    http.delete(`/api/notes/${id}`).then(r => r.data),

  search: (q: string) =>
    http.get<Note[]>('/api/notes/search', { params: { q } }).then(r => r.data),

  favorites: () =>
    http.get<Note[]>('/api/notes/favorites').then(r => r.data),
};

// ── Tags API ──────────────────────────────────────────────────

export const tagsApi = {
  list: () => http.get<Tag[]>('/api/tags').then(r => r.data),
};

// ── Error helper ──────────────────────────────────────────────

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
