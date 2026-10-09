import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { SteadilyStore, SteadilyStoreApi } from './create-store';

const StoreContext = createContext<SteadilyStoreApi | null>(null);
export function StoreProvider({
  store,
  children,
}: {
  store: SteadilyStoreApi;
  children: ReactNode;
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
export function useStoreApi() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider is required.');
  return store;
}
export function useSteadily<T>(selector: (state: SteadilyStore) => T): T {
  return useStore(useStoreApi(), selector);
}
