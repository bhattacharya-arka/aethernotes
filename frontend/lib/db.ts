'use client';

import { openDB, type IDBPDatabase } from 'idb';
import type { Note, PendingMutation } from '@/types';

const DB_NAME    = 'aethernotes-offline';
const DB_VERSION = 1;

type AetherDB = {
  notes: {
    key: string;
    value: Note;
    indexes: { by_updated: string; by_user: string };
  };
  mutations: {
    key: number;
    value: PendingMutation;
    autoIncrement: true;
  };
};

let _db: IDBPDatabase<AetherDB> | null = null;

async function getDb(): Promise<IDBPDatabase<AetherDB>> {
  if (_db) return _db;
  _db = await openDB<AetherDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('by_updated', 'updatedAt');
        store.createIndex('by_user', 'userId');
      }
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return _db;
}

// ── Notes ─────────────────────────────────────────────────────

export async function cacheNotes(notes: Note[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('notes', 'readwrite');
  await Promise.all([...notes.map(n => tx.store.put(n)), tx.done]);
}

export async function getCachedNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.getAllFromIndex('notes', 'by_updated');
}

export async function getCachedNote(id: string): Promise<Note | undefined> {
  const db = await getDb();
  return db.get('notes', id);
}

export async function putCachedNote(note: Note): Promise<void> {
  const db = await getDb();
  await db.put('notes', note);
}

export async function deleteCachedNote(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('notes', id);
}

export async function clearNoteCache(): Promise<void> {
  const db = await getDb();
  await db.clear('notes');
}

// ── Offline mutation queue ────────────────────────────────────

export async function queueMutation(m: Omit<PendingMutation, 'id'>): Promise<void> {
  const db = await getDb();
  await db.add('mutations', { ...m, createdAt: Date.now() } as PendingMutation);
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDb();
  return db.getAll('mutations');
}

export async function clearMutation(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('mutations', id);
}

export async function clearAllMutations(): Promise<void> {
  const db = await getDb();
  await db.clear('mutations');
}
