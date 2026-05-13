import { create } from 'zustand';

import type { Provider } from '@/types/provider';

interface ProviderStore {
  providers: Provider[];
  setProviders: (providers: Provider[]) => void;
  upsertProvider: (p: Provider) => void;
  removeProvider: (id: string) => void;
}

export const useProviderStore = create<ProviderStore>((set) => ({
  providers: [],
  setProviders: (providers) => set({ providers }),
  upsertProvider: (p) =>
    set((state) => {
      const exists = state.providers.some((x) => x.id === p.id);
      const next = exists
        ? state.providers.map((x) => (x.id === p.id ? p : x))
        : [...state.providers, p];
      return { providers: next };
    }),
  removeProvider: (id) =>
    set((state) => ({ providers: state.providers.filter((p) => p.id !== id) })),
}));
