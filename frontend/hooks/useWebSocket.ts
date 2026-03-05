'use client';

import { useEffect, useRef } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store/useStore';
import { noteKeys } from '@/hooks/useNotes';
import type { WsNoteUpdate } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080';

export function useWebSocket() {
  const stompRef = useRef<Client | null>(null);
  const qc       = useQueryClient();
  const user     = useStore(s => s.user);
  const token    = useStore(s => s.token);

  useEffect(() => {
    if (!user || !token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,

      onConnect: () => {
        // Subscribe to per-user note updates
        client.subscribe(`/topic/notes/${user.id}`, (msg: IMessage) => {
          try {
            const update: WsNoteUpdate = JSON.parse(msg.body);
            handleUpdate(update);
          } catch {
            // ignore malformed messages
          }
        });
      },

      onStompError: frame => {
        console.warn('[WS] STOMP error:', frame.headers?.message);
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
      stompRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  function handleUpdate(update: WsNoteUpdate) {
    switch (update.action) {
      case 'CREATED':
      case 'UPDATED':
        qc.invalidateQueries({ queryKey: noteKeys.lists() });
        qc.invalidateQueries({ queryKey: noteKeys.detail(update.noteId) });
        break;
      case 'DELETED':
        qc.removeQueries({ queryKey: noteKeys.detail(update.noteId) });
        qc.invalidateQueries({ queryKey: noteKeys.lists() });
        break;
    }
  }
}
