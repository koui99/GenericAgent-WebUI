import { create } from 'zustand';

import type { Session } from '@/types/session';

interface SessionStore {
  sessions: Session[];
  currentSessionId: string | null;
  setSessions: (sessions: Session[]) => void;
  setCurrent: (id: string | null) => void;
  upsertSession: (s: Session) => void;
  removeSession: (id: string) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  currentSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setCurrent: (id) => set({ currentSessionId: id }),
  upsertSession: (s) =>
    set((state) => {
      const exists = state.sessions.some((x) => x.id === s.id);
      const next = exists
        ? state.sessions.map((x) => (x.id === s.id ? { ...x, ...s } : x))
        : [s, ...state.sessions];
      return { sessions: next };
    }),
  removeSession: (id) =>
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),
}));
